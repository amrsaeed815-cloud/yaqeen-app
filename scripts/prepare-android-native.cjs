
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ANDROID = path.join(ROOT, "android");
const MAIN = path.join(ANDROID, "app", "src", "main");
const JAVA_ROOT = path.join(MAIN, "java");
const RAW = path.join(MAIN, "res", "raw");
const MANIFEST = path.join(MAIN, "AndroidManifest.xml");

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.trimStart() + "\n", "utf8");
}

function findMainActivity(dir) {
  if (!fs.existsSync(dir)) return null;

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      const found = findMainActivity(full);
      if (found) return found;
    } else if (item.name === "MainActivity.java") {
      return full;
    }
  }

  return null;
}

if (!fs.existsSync(MANIFEST)) {
  throw new Error("AndroidManifest.xml not found. Run npx cap add android first.");
}

const activityFile = findMainActivity(JAVA_ROOT);

if (!activityFile) {
  throw new Error("MainActivity.java not found.");
}

const activity = fs.readFileSync(activityFile, "utf8");
const packageMatch = activity.match(/package\s+([\w.]+)\s*;/);

if (!packageMatch) {
  throw new Error("Cannot detect Android package name.");
}

const packageName = packageMatch[1];
const packageDir = path.join(JAVA_ROOT, ...packageName.split("."));

fs.mkdirSync(RAW, { recursive: true });

// Copy offline audio files into Android resources.
const audioFiles = [
  ["Beautiful_adhan.ogg", "yaqeen_adhan.ogg"],
  ["adhan.ogg", "yaqeen_adhan_alt.ogg"],
  ["after-adhan-dua.mp3", "yaqeen_dua.mp3"]
];

for (const [source, destination] of audioFiles) {
  const from = path.join(ROOT, source);

  if (!fs.existsSync(from)) {
    throw new Error("Required audio file not found: " + source);
  }

  fs.copyFileSync(from, path.join(RAW, destination));
  console.log("Copied offline audio:", source);
}

// Native Capacitor plugin.
writeFile(
  path.join(packageDir, "YaqeenPrayerPlugin.java"),
  `
package ${packageName};

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "YaqeenPrayer")
public class YaqeenPrayerPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        JSONArray schedules = call.getArray("schedules");

        if (schedules == null) {
            call.reject("schedules is required");
            return;
        }

        Context context = getContext();
        AlarmManager alarmManager =
            (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                !alarmManager.canScheduleExactAlarms()) {
                JSObject result = new JSObject();
                result.put("scheduled", false);
                result.put("permissionRequired", true);
                call.resolve(result);
                return;
            }

            cancelAll(context);

            for (int i = 0; i < schedules.length(); i++) {
                JSONObject item = schedules.getJSONObject(i);
                long time = item.getLong("time");
                String name = item.optString("name", "Prayer");
                String sound = item.optString("sound", "yaqeen_adhan");

                if (time <= System.currentTimeMillis()) continue;

                Intent intent = new Intent(context, YaqeenAlarmReceiver.class);
                intent.putExtra("name", name);
                intent.putExtra("sound", sound);

                int requestCode = (int) (time % Integer.MAX_VALUE);

                PendingIntent pending = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT |
                    PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP, time, pending
                    );
                } else {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP, time, pending
                    );
                }
            }

            JSObject result = new JSObject();
            result.put("scheduled", true);
            result.put("count", schedules.length());
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Prayer scheduling failed", e);
        }
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager manager =
                (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);

            if (!manager.canScheduleExactAlarms()) {
                Intent intent = new Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
                );
                intent.setData(
                    android.net.Uri.parse("package:" + getContext().getPackageName())
                );
                getActivity().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        cancelAll(getContext());
        call.resolve();
    }

    private void cancelAll(Context context) {
        AlarmManager manager =
            (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        android.content.SharedPreferences prefs =
            context.getSharedPreferences("yaqeen_prayers", Context.MODE_PRIVATE);

        java.util.Set<String> keys = prefs.getStringSet("ids",
            new java.util.HashSet<String>());

        for (String key : keys) {
            try {
                int id = Integer.parseInt(key);
                Intent intent = new Intent(context, YaqeenAlarmReceiver.class);
                PendingIntent pending = PendingIntent.getBroadcast(
                    context, id, intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
                );
                if (pending != null) manager.cancel(pending);
            } catch (Exception ignored) {}
        }

        prefs.edit().remove("ids").apply();
    }
}
`
);

writeFile(
  path.join(packageDir, "YaqeenAlarmReceiver.java"),
  `
package ${packageName};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class YaqeenAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Intent service = new Intent(context, YaqeenAdhanService.class);
        service.putExtra("name", intent.getStringExtra("name"));
        service.putExtra("sound", intent.getStringExtra("sound"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(service);
        } else {
            context.startService(service);
        }
    }
}
`
);

writeFile(
  path.join(packageDir, "YaqeenAdhanService.java"),
  `
package ${packageName};

import android.app.Service;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;

public class YaqeenAdhanService extends Service {
    private static final String CHANNEL = "yaqeen_adhan_channel";
    private MediaPlayer player;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();

        Notification notification = new Notification.Builder(this, CHANNEL)
            .setContentTitle("يقين")
            .setContentText("حان الآن موعد الصلاة")
            .setSmallIcon(getApplicationInfo().icon)
            .setOngoing(true)
            .build();

        startForeground(1001, notification);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL, "أذان يقين",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("تنبيهات مواقيت الصلاة");
            getSystemService(NotificationManager.class)
                .createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        stopPlayer();

        String sound = intent == null ? "yaqeen_adhan" :
            intent.getStringExtra("sound");

        if (sound == null) sound = "yaqeen_adhan";

        int resource = getResources().getIdentifier(
            sound, "raw", getPackageName()
        );

        if (resource == 0) resource = R.raw.yaqeen_adhan;

        try {
            player = MediaPlayer.create(this, resource);

            if (player == null) {
                stopSelf();
                return START_NOT_STICKY;
            }

            player.setOnCompletionListener(mp -> {
                stopPlayer();
                stopForeground(true);
                stopSelf();
            });

            player.start();

        } catch (Exception e) {
            stopPlayer();
            stopForeground(true);
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    private void stopPlayer() {
        if (player != null) {
            try {
                if (player.isPlaying()) player.stop();
                player.release();
            } catch (Exception ignored) {}
            player = null;
        }
    }

    @Override
    public void onDestroy() {
        stopPlayer();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
`
);

writeFile(
  path.join(packageDir, "YaqeenBootReceiver.java"),
  `
package ${packageName};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class YaqeenBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            // The app must refresh its locally cached prayer schedule
            // when it is next opened. No internet is required for cached data.
        }
    }
}
`
);

// Register plugin in MainActivity.
String activitySource = fs.readFileSync(activityFile, "utf8");

if (!activitySource.includes("YaqeenPrayerPlugin.class")) {
  activitySource = activitySource.replace(
    /public class MainActivity extends BridgeActivity\s*\{/,
    "public class MainActivity extends BridgeActivity {\n" +
    "    @Override\n" +
    "    public void onCreate(android.os.Bundle savedInstanceState) {\n" +
    "        registerPlugin(YaqeenPrayerPlugin.class);\n" +
    "        super.onCreate(savedInstanceState);\n" +
    "    }\n"
  );

  fs.writeFileSync(activityFile, activitySource, "utf8");
}

// Update AndroidManifest.xml.
let manifest = fs.readFileSync(MANIFEST, "utf8");

const permissions = [
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.WAKE_LOCK",
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
];

for (const permission of permissions) {
  if (!manifest.includes('android:name="' + permission + '"')) {
    manifest = manifest.replace(
      "<application",
      '<uses-permission android:name="' + permission + '" />\n    <application'
    );
  }
}

const components = [
  '<receiver android:name=".' + 'YaqeenAlarmReceiver" android:exported="false" />',
  '<receiver android:name=".' + 'YaqeenBootReceiver" android:enabled="true" android:exported="false">',
  '    <intent-filter>',
  '        <action android:name="android.intent.action.BOOT_COMPLETED" />',
  '        <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />',
  '    </intent-filter>',
  '</receiver>',
  '<service android:name=".' + 'YaqeenAdhanService" android:exported="false" android:foregroundServiceType="mediaPlayback" />'
].join("\n        ");

if (!manifest.includes("YaqeenAdhanService")) {
  manifest = manifest.replace("</application>", components + "\n    </application>");
}

fs.writeFileSync(MANIFEST, manifest, "utf8");

console.log("Yaqeen native prayer files prepared.");
