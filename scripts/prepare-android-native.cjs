
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const MAIN = path.join(ROOT, "android", "app", "src", "main");
const RAW = path.join(MAIN, "res", "raw");
const MANIFEST = path.join(MAIN, "AndroidManifest.xml");

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.trimStart() + "\n", "utf8");
  console.log("Created:", path.relative(ROOT, file));
}

if (!fs.existsSync(MANIFEST)) {
  throw new Error("AndroidManifest.xml not found. Run npx cap add android first.");
}

function findMainActivity(directory) {
  if (!fs.existsSync(directory)) return null;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const found = findMainActivity(full);
      if (found) return found;
    } else if (entry.name === "MainActivity.java") {
      return full;
    }
  }

  return null;
}

const mainActivity = findMainActivity(path.join(MAIN, "java"));

if (!mainActivity) {
  throw new Error("MainActivity.java was not found.");
}

const activitySource = fs.readFileSync(mainActivity, "utf8");
const packageMatch = activitySource.match(/^\s*package\s+([\w.]+)\s*;/m);

if (!packageMatch) {
  throw new Error("Could not detect MainActivity package.");
}

const PACKAGE = packageMatch[1];
const JAVA = path.dirname(mainActivity);
const packagePath = PACKAGE.replace(/\./g, "/");

console.log("Android package:", PACKAGE);

// Prepare available local audio files.
fs.mkdirSync(RAW, { recursive: true });

const audioFiles = [
  ["Beautiful_adhan.ogg", "yaqeen_adhan.ogg"],
  ["adhan.ogg", "yaqeen_adhan_alt.ogg"],
  ["after-adhan-dua.mp3", "yaqeen_dua.mp3"]
];

for (const [source, destination] of audioFiles) {
  const from = path.join(ROOT, source);

  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(RAW, destination));
    console.log("Audio copied:", source);
  } else {
    console.log("Audio not found, skipped:", source);
  }
}

// Native Capacitor plugin.
writeFile(
  path.join(JAVA, "YaqeenPrayerPlugin.java"),
  `
package ${PACKAGE};

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "YaqeenPrayer")
public class YaqeenPrayerPlugin extends Plugin {

    private static final String PREFS = "yaqeen_prayer";
    private static final String KEY = "schedules";

    @PluginMethod
    public void schedule(PluginCall call) {
        JSONArray schedules = call.getArray("schedules");

        if (schedules == null) {
            call.reject("Missing schedules array");
            return;
        }

        try {
            Context context = getContext();
            SharedPreferences prefs =
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

            JSONArray oldSchedules =
                new JSONArray(prefs.getString(KEY, "[]"));

            AlarmManager manager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            cancelSchedules(context, manager, oldSchedules);

            int scheduled = 0;

            for (int i = 0; i < schedules.length(); i++) {
                JSONObject item = schedules.getJSONObject(i);
                long at = item.optLong("at", 0);

                if (at <= System.currentTimeMillis()) continue;

                int id = item.optInt("id", i + 1);

                Intent intent = makeAlarmIntent(context, item);
                PendingIntent pending = PendingIntent.getBroadcast(
                    context,
                    id,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT |
                    PendingIntent.FLAG_IMMUTABLE
                );

                setAlarm(manager, at, pending);
                scheduled++;
            }

            prefs.edit().putString(KEY, schedules.toString()).apply();

            JSObject result = new JSObject();
            result.put("scheduled", scheduled);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Could not schedule prayers", e);
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs =
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

            JSONArray schedules =
                new JSONArray(prefs.getString(KEY, "[]"));

            AlarmManager manager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            cancelSchedules(context, manager, schedules);
            prefs.edit().remove(KEY).apply();

            call.resolve();

        } catch (Exception e) {
            call.reject("Could not cancel prayers", e);
        }
    }

    static Intent makeAlarmIntent(Context context, JSONObject item) {
        Intent intent = new Intent(context, YaqeenAlarmReceiver.class);

        intent.putExtra("sound", item.optString("sound", "yaqeen_adhan"));
        intent.putExtra("volume", item.optDouble("volume", 0.8));
        intent.putExtra("dua", item.optBoolean("dua", false));
        intent.putExtra("prayer", item.optString("prayer", "الصلاة"));

        return intent;
    }

    static void setAlarm(
        AlarmManager manager,
        long at,
        PendingIntent pending
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && !manager.canScheduleExactAlarms()) {
            manager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                at,
                pending
            );
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            manager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                at,
                pending
            );
        } else {
            manager.setExact(
                AlarmManager.RTC_WAKEUP,
                at,
                pending
            );
        }
    }

    static void cancelSchedules(
        Context context,
        AlarmManager manager,
        JSONArray schedules
    ) throws Exception {
        for (int i = 0; i < schedules.length(); i++) {
            JSONObject item = schedules.getJSONObject(i);
            int id = item.optInt("id", i + 1);

            Intent intent = new Intent(context, YaqeenAlarmReceiver.class);

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
        }
    }
}
`
);

// Alarm receiver.
writeFile(
  path.join(JAVA, "YaqeenAlarmReceiver.java"),
  `
package ${PACKAGE};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class YaqeenAlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        Intent service = new Intent(context, YaqeenAdhanService.class);

        service.putExtra("sound", intent.getStringExtra("sound"));
        service.putExtra("volume", intent.getDoubleExtra("volume", 0.8));
        service.putExtra("dua", intent.getBooleanExtra("dua", false));
        service.putExtra("prayer", intent.getStringExtra("prayer"));

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(service);
            } else {
                context.startService(service);
            }
        } catch (Exception e) {
            android.util.Log.e("YaqeenAdhan", "Could not start adhan service", e);
        }
    }
}
`
);

// Background audio service.
writeFile(
  path.join(JAVA, "YaqeenAdhanService.java"),
  `
package ${PACKAGE};

import android.app.Service;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.MediaPlayer;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.IBinder;

public class YaqeenAdhanService extends Service {

    private static final String CHANNEL = "yaqeen_adhan_channel";
    private MediaPlayer player;
    private boolean playDua;
    private float volume = 0.8f;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(1001, makeNotification());

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String sound = intent.getStringExtra("sound");
        playDua = intent.getBooleanExtra("dua", false);
        volume = Math.max(
            0f,
            Math.min(1f, (float) intent.getDoubleExtra("volume", 0.8))
        );

        playSound(sound == null ? "yaqeen_adhan" : sound);
        return START_NOT_STICKY;
    }

    private void playSound(String name) {
        int resource = getResources().getIdentifier(
            name,
            "raw",
            getPackageName()
        );

        if (resource == 0) {
            stopSelf();
            return;
        }

        try {
            AudioAttributes attributes =
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                player = MediaPlayer.create(this, resource, attributes, 0);
            } else {
                player = MediaPlayer.create(this, resource);
            }

            if (player == null) {
                stopSelf();
                return;
            }

            player.setVolume(volume, volume);

            player.setOnCompletionListener(mp -> {
                mp.release();
                player = null;

                if (playDua) {
                    playDua = false;
                    playSound("yaqeen_dua");
                } else {
                    stopSelf();
                }
            });

            player.setOnErrorListener((mp, what, extra) -> {
                stopSelf();
                return true;
            });

            player.start();

        } catch (Exception e) {
            android.util.Log.e("YaqeenAdhan", "Audio playback failed", e);
            stopSelf();
        }
    }

    private Notification makeNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return new Notification.Builder(this, CHANNEL)
                .setContentTitle("يقين")
                .setContentText("حان الآن وقت الصلاة")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setOngoing(true)
                .build();
        }

        return new Notification.Builder(this)
            .setContentTitle("يقين")
            .setContentText("حان الآن وقت الصلاة")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(true)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL,
                "أذان الصلاة",
                NotificationManager.IMPORTANCE_HIGH
            );

            getSystemService(NotificationManager.class)
                .createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {
        if (player != null) {
            player.release();
            player = null;
        }

        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
`
);

// Restore alarms after reboot.
writeFile(
  path.join(JAVA, "YaqeenBootReceiver.java"),
  `
package ${PACKAGE};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.app.AlarmManager;
import android.app.PendingIntent;

import org.json.JSONArray;
import org.json.JSONObject;

public class YaqeenBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
            && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        SharedPreferences prefs =
            context.getSharedPreferences("yaqeen_prayer", Context.MODE_PRIVATE);

        try {
            JSONArray schedules =
                new JSONArray(prefs.getString("schedules", "[]"));

            AlarmManager manager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            for (int i = 0; i < schedules.length(); i++) {
                JSONObject item = schedules.getJSONObject(i);
                long at = item.optLong("at", 0);

                if (at <= System.currentTimeMillis()) continue;

                int id = item.optInt("id", i + 1);

                Intent alarm = YaqeenPrayerPlugin.makeAlarmIntent(context, item);

                PendingIntent pending = PendingIntent.getBroadcast(
                    context,
                    id,
                    alarm,
                    PendingIntent.FLAG_UPDATE_CURRENT |
                    PendingIntent.FLAG_IMMUTABLE
                );

                YaqeenPrayerPlugin.setAlarm(manager, at, pending);
            }

        } catch (Exception e) {
            android.util.Log.e("YaqeenAdhan", "Could not restore prayer alarms", e);
        }
    }
}
`
);

// Add permissions and components to AndroidManifest.xml.
let manifest = fs.readFileSync(MANIFEST, "utf8");

const openingTag = manifest.match(/<manifest\b[^>]*>/);

if (!openingTag) {
  throw new Error("Invalid AndroidManifest.xml: manifest tag not found.");
}

const permissions = [
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.WAKE_LOCK",
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
];

const missingPermissions = permissions
  .filter(name => !new RegExp(
    '<uses-permission\\s+android:name="' + name.replace(/\./g, "\\.") + '"'
  ).test(manifest))
  .map(name => '    <uses-permission android:name="' + name + '" />');

if (missingPermissions.length) {
  const position = manifest.indexOf(openingTag[0]) + openingTag[0].length;

  manifest =
    manifest.slice(0, position) +
    "\n" + missingPermissions.join("\n") +
    manifest.slice(position);
}

const components = `
        <receiver
            android:name="${PACKAGE}.YaqeenAlarmReceiver"
            android:enabled="true"
            android:exported="false" />

        <receiver
            android:name="${PACKAGE}.YaqeenBootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>

        <service
            android:name="${PACKAGE}.YaqeenAdhanService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />
`;

if (!manifest.includes("YaqeenAdhanService")) {
  if (!manifest.includes("</application>")) {
    throw new Error("Invalid AndroidManifest.xml: application tag not found.");
  }

  manifest = manifest.replace(
    "</application>",
    components + "\n    </application>"
  );
}

fs.writeFileSync(MANIFEST, manifest, "utf8");
console.log("Android manifest updated.");

// Register the native plugin in MainActivity.
let activity = fs.readFileSync(mainActivity, "utf8");

if (!activity.includes("YaqeenPrayerPlugin")) {
  if (!activity.includes("import android.os.Bundle;")) {
    activity = activity.replace(
      /package\s+[\w.]+\s*;/,
      match => match + "\n\nimport android.os.Bundle;"
    );
  }

  const classPattern = /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/;

  if (!classPattern.test(activity)) {
    throw new Error("Could not locate MainActivity class declaration.");
  }

  if (/public\s+void\s+onCreate\s*\(/.test(activity)) {
    activity = activity.replace(
      /(public\s+void\s+onCreate\s*\([^)]*\)\s*\{)/,
      "$1\n        registerPlugin(YaqeenPrayerPlugin.class);"
    );
  } else {
    activity = activity.replace(
      classPattern,
      "$&\n    @Override\n" +
      "    public void onCreate(Bundle savedInstanceState) {\n" +
      "        registerPlugin(YaqeenPrayerPlugin.class);\n" +
      "        super.onCreate(savedInstanceState);\n" +
      "    }\n"
    );
  }

  fs.writeFileSync(mainActivity, activity, "utf8");
}

console.log("Yaqeen native prayer system prepared successfully.");
