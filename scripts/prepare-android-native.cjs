
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ANDROID = path.join(ROOT, "android");
const APP = path.join(ANDROID, "app");
const MAIN = path.join(APP, "src", "main");
const JAVA = path.join(
  MAIN,
  "java",
  "com",
  "yaqeen",
  "app"
);
const RAW = path.join(MAIN, "res", "raw");

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.trimStart() + "\n", "utf8");
  console.log("Created:", path.relative(ROOT, file));
}

if (!fs.existsSync(path.join(MAIN, "AndroidManifest.xml"))) {
  throw new Error(
    "Android project is missing. Run npx cap add android first."
  );
}

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

writeFile(
  path.join(JAVA, "YaqeenPrayerPlugin.java"),
  `
package com.yaqeen.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.os.Build;

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
            call.reject("Missing schedules");
            return;
        }

        try {
            Context context = getContext();
            SharedPreferences prefs =
                context.getSharedPreferences("yaqeen_prayer", Context.MODE_PRIVATE);

            prefs.edit().putString("schedules", schedules.toString()).apply();

            AlarmManager manager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            cancelAll(context, manager, schedules.length());

            for (int i = 0; i < schedules.length(); i++) {
                JSONObject item = schedules.getJSONObject(i);

                long at = item.optLong("at", 0);
                if (at <= System.currentTimeMillis()) continue;

                Intent intent = new Intent(context, YaqeenAlarmReceiver.class);
                intent.putExtra("sound", item.optString("sound", "yaqeen_adhan"));
                intent.putExtra("volume", item.optDouble("volume", 0.8));
                intent.putExtra("dua", item.optBoolean("dua", false));
                intent.putExtra("prayer", item.optString("prayer", "الصلاة"));

                PendingIntent pending = PendingIntent.getBroadcast(
                    context,
                    item.optInt("id", i + 1),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    manager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        at,
                        pending
                    );
                } else {
                    manager.setExact(AlarmManager.RTC_WAKEUP, at, pending);
                }
            }

            JSObject result = new JSObject();
            result.put("scheduled", schedules.length());
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
                context.getSharedPreferences("yaqeen_prayer", Context.MODE_PRIVATE);

            JSONArray schedules =
                new JSONArray(prefs.getString("schedules", "[]"));

            AlarmManager manager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            cancelAll(context, manager, schedules.length());
            prefs.edit().remove("schedules").apply();

            call.resolve();
        } catch (Exception e) {
            call.reject("Could not cancel alarms", e);
        }
    }

    private void cancelAll(
        Context context,
        AlarmManager manager,
        int count
    ) {
        for (int i = 0; i < count; i++) {
            Intent intent = new Intent(context, YaqeenAlarmReceiver.class);

            PendingIntent pending = PendingIntent.getBroadcast(
                context,
                i + 1,
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
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

writeFile(
  path.join(JAVA, "YaqeenAlarmReceiver.java"),
  `
package com.yaqeen.app;

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
  path.join(JAVA, "YaqeenAdhanService.java"),
  `
package com.yaqeen.app;

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
        volume = (float) intent.getDoubleExtra("volume", 0.8);

        playSound(sound);
        return START_NOT_STICKY;
    }

    private void playSound(String name) {
        int resource = getResources().getIdentifier(
            name == null ? "yaqeen_adhan" : name,
            "raw",
            getPackageName()
        );

        if (resource == 0) {
            stopSelf();
            return;
        }

        try {
            player = MediaPlayer.create(this, resource);

            if (player == null) {
                stopSelf();
                return;
            }

            player.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            );

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

            player.start();

        } catch (Exception e) {
            stopSelf();
        }
    }

    private Notification makeNotification() {
        return new Notification.Builder(this, CHANNEL)
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
  path.join(JAVA, "YaqeenBootReceiver.java"),
  `
package com.yaqeen.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public class YaqeenBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
            && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
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

                Intent alarm = new Intent(context, YaqeenAlarmReceiver.class);
                alarm.putExtra("sound", item.optString("sound", "yaqeen_adhan"));
                alarm.putExtra("volume", item.optDouble("volume", 0.8));
                alarm.putExtra("dua", item.optBoolean("dua", false));
                alarm.putExtra("prayer", item.optString("prayer", "الصلاة"));

                PendingIntent pending = PendingIntent.getBroadcast(
                    context,
                    item.optInt("id", i + 1),
                    alarm,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    manager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        at,
                        pending
                    );
                } else {
                    manager.setExact(AlarmManager.RTC_WAKEUP, at, pending);
                }
            }
        } catch (Exception ignored) {
        }
    }
}
`
);

const manifestPath = path.join(MAIN, "AndroidManifest.xml");
let manifest = fs.readFileSync(manifestPath, "utf8");

const permissions = [
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />'
];

for (const permission of permissions) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(
      "<manifest",
      "<manifest"
    );
    const end = manifest.indexOf(">");
    manifest =
      manifest.slice(0, end + 1) +
      "\n    " + permission +
      manifest.slice(end + 1);
  }
}

const components = `
        <receiver
            android:name="com.yaqeen.app.YaqeenAlarmReceiver"
            android:enabled="true"
            android:exported="false" />

        <receiver
            android:name="com.yaqeen.app.YaqeenBootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>

        <service
            android:name="com.yaqeen.app.YaqeenAdhanService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />
`;

if (!manifest.includes("YaqeenAdhanService")) {
  manifest = manifest.replace("</application>", components + "\n    </application>");
}

fs.writeFileSync(manifestPath, manifest, "utf8");

const mainActivity = path.join(JAVA, "MainActivity.java");

if (!fs.existsSync(mainActivity)) {
  throw new Error(
    "MainActivity.java not found at " + path.relative(ROOT, mainActivity)
  );
}

let activity = fs.readFileSync(mainActivity, "utf8");

if (!activity.includes("YaqeenPrayerPlugin")) {
  activity = activity.replace(
    /package\s+com\.yaqeen\.app\s*;/,
    "package com.yaqeen.app;\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;"
  );

  activity = activity.replace(
    /public class MainActivity extends BridgeActivity\s*\{/,
    "public class MainActivity extends BridgeActivity {\n" +
    "    @Override\n" +
    "    public void onCreate(Bundle savedInstanceState) {\n" +
    "        registerPlugin(YaqeenPrayerPlugin.class);\n" +
    "        super.onCreate(savedInstanceState);\n" +
    "    }\n"
  );

  fs.writeFileSync(mainActivity, activity, "utf8");
}

console.log("Yaqeen native prayer files prepared.");

