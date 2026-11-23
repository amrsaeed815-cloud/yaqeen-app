
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

// Offline adhan audio
const audioFiles = [
  ["Beautiful_adhan.ogg", "yaqeen_adhan.ogg"]
];

for (const [source, destination] of audioFiles) {
  const from = path.join(ROOT, source);

  if (!fs.existsSync(from)) {
    throw new Error("Required audio file not found: " + source);
  }

  fs.copyFileSync(from, path.join(RAW, destination));
  console.log("Copied offline audio:", source);
}

// Prayer scheduling plugin
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

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "YaqeenPrayer")
public class YaqeenPrayerPlugin extends Plugin {

    static final String PREFS = "yaqeen_prayers";
    static final String IDS = "ids";
    static final String SCHEDULES = "schedules";

    @PluginMethod
    public void schedule(PluginCall call) {

        JSONArray schedules = call.getArray("schedules");

        if (schedules == null) {
            call.reject("schedules is required");
            return;
        }

        Context context = getContext();

        AlarmManager manager = (AlarmManager)
            context.getSystemService(Context.ALARM_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && !manager.canScheduleExactAlarms()) {

            JSObject result = new JSObject();
            result.put("scheduled", false);
            result.put("permissionRequired", true);
            call.resolve(result);
            return;
        }

        try {

            cancelAll(context, false);

            Set<String> ids = new HashSet<>();
            int count = 0;

            for (int i = 0; i < schedules.length(); i++) {

                JSONObject item = schedules.getJSONObject(i);

                long time = item.getLong("time");

                if (time <= System.currentTimeMillis()) continue;

                String name = item.optString("name", "الصلاة");
                String sound = item.optString("sound", "yaqeen_adhan");

                int id = (int) (time % Integer.MAX_VALUE);

                Intent alarmIntent = new Intent(
                    context, YaqeenAlarmReceiver.class
                );

                alarmIntent.putExtra("name", name);
                alarmIntent.putExtra("sound", sound);

                PendingIntent pending = PendingIntent.getBroadcast(
                    context,
                    id,
                    alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT |
                    PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    manager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        time,
                        pending
                    );
                } else {
                    manager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        time,
                        pending
                    );
                }

                ids.add(String.valueOf(id));
                count++;
            }

            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putStringSet(IDS, ids)
                .putString(SCHEDULES, schedules.toString())
                .apply();

            JSObject result = new JSObject();
            result.put("scheduled", true);
            result.put("count", count);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Prayer scheduling failed", e);
        }
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {

            AlarmManager manager = (AlarmManager)
                getContext().getSystemService(Context.ALARM_SERVICE);

            if (!manager.canScheduleExactAlarms()) {

                Intent intent = new Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
                );

                intent.setData(android.net.Uri.parse(
                    "package:" + getContext().getPackageName()
                ));

                getActivity().startActivity(intent);
            }
        }

        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        cancelAll(getContext(), true);
        call.resolve();
    }

    static void cancelAll(Context context, boolean clearSchedules) {

        AlarmManager manager = (AlarmManager)
            context.getSystemService(Context.ALARM_SERVICE);

        android.content.SharedPreferences prefs =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        Set<String> ids = new HashSet<>(
            prefs.getStringSet(IDS, new HashSet<String>())
        );

        for (String value : ids) {

            try {

                int id = Integer.parseInt(value);

                Intent intent = new Intent(
                    context, YaqeenAlarmReceiver.class
                );

                PendingIntent pending = PendingIntent.getBroadcast(
                    context,
                    id,
                    intent,
                    PendingIntent.FLAG_NO_CREATE |
                    PendingIntent.FLAG_IMMUTABLE
                );

                if (pending != null) {
                    manager.cancel(pending);
                    pending.cancel();
                }

            } catch (Exception ignored) {}
        }

        android.content.SharedPreferences.Editor editor =
            prefs.edit().remove(IDS);

        if (clearSchedules) {
            editor.remove(SCHEDULES);
        }

        editor.apply();
    }
}
`
);

// Alarm receiver
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

        Intent service = new Intent(
            context, YaqeenAdhanService.class
        );

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

// Adhan foreground service
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

        Notification.Builder builder;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL);
        } else {
            builder = new Notification.Builder(this);
        }

        Notification notification = builder
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
                CHANNEL,
                "أذان يقين",
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

        String sound = intent == null
            ? "yaqeen_adhan"
            : intent.getStringExtra("sound");

        if (sound == null) sound = "yaqeen_adhan";

        int resource = getResources().getIdentifier(
            sound,
            "raw",
            getPackageName()
        );

        if (resource == 0) {
            resource = R.raw.yaqeen_adhan;
        }

        try {

            player = MediaPlayer.create(this, resource);

            if (player == null) {
                stopForeground(true);
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

// Restore prayer alarms after reboot
writeFile(
  path.join(packageDir, "YaqeenBootReceiver.java"),
  `
package ${packageName};

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

public class YaqeenBootReceiver extends BroadcastReceiver {

    private static final String PREFS = "yaqeen_prayers";
    private static final String IDS = "ids";
    private static final String SCHEDULES = "schedules";

    @Override
    public void onReceive(Context context, Intent intent) {

        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();

        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        try {

            android.content.SharedPreferences prefs =
                context.getSharedPreferences(
                    PREFS,
                    Context.MODE_PRIVATE
                );

            String saved = prefs.getString(SCHEDULES, null);

            if (saved == null) return;

            AlarmManager manager = (AlarmManager)
                context.getSystemService(Context.ALARM_SERVICE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                    && !manager.canScheduleExactAlarms()) {
                return;
            }

            JSONArray schedules = new JSONArray(saved);
            Set<String> ids = new HashSet<>();

            for (int i = 0; i < schedules.length(); i++) {

                JSONObject item = schedules.getJSONObject(i);

                long time = item.getLong("time");

                if (time <= System.currentTimeMillis()) continue;

                String name = item.optString("name", "الصلاة");
                String sound = item.optString("sound", "yaqeen_adhan");

                int id = (int) (time % Integer.MAX_VALUE);

                Intent alarmIntent = new Intent(
                    context,
                    YaqeenAlarmReceiver.class
                );

                alarmIntent.putExtra("name", name);
                alarmIntent.putExtra("sound", sound);

                PendingIntent pending = PendingIntent.getBroadcast(
                    context,
                    id,
                    alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT |
                    PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {

                    manager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        time,
                        pending
                    );

                } else {

                    manager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        time,
                        pending
                    );
                }

                ids.add(String.valueOf(id));
            }

            prefs.edit()
                .putStringSet(IDS, ids)
                .apply();

            android.util.Log.d(
                "YaqeenBootReceiver",
                "Prayer alarms restored: " + ids.size()
            );

        } catch (Exception e) {

            android.util.Log.e(
                "YaqeenBootReceiver",
                "Failed to restore prayer alarms",
                e
            );
        }
    }
}
`
);

// Register native plugin in MainActivity
let activitySource = fs.readFileSync(activityFile, "utf8");

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

// Android manifest permissions
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

// Android components
const components = [
  '<receiver android:name=".YaqeenAlarmReceiver" android:exported="false" />',

  '<receiver android:name=".YaqeenBootReceiver" android:enabled="true" android:exported="true">',
  '    <intent-filter>',
  '        <action android:name="android.intent.action.BOOT_COMPLETED" />',
  '        <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />',
  '    </intent-filter>',
  '</receiver>',

  '<service android:name=".YaqeenAdhanService" android:exported="false" android:foregroundServiceType="mediaPlayback" />'
].join("\n        ");

if (!manifest.includes("YaqeenAdhanService")) {
  manifest = manifest.replace(
    "</application>",
    components + "\n    </application>"
  );
}

fs.writeFileSync(MANIFEST, manifest, "utf8");

console.log("Yaqeen native prayer files prepared successfully.");
