package com.nkb.itms.agent

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.UserManager
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

class PolicyManager private constructor(private val context: Context) {

    private val dpm: DevicePolicyManager = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent: ComponentName = AdminReceiver.getComponentName(context)
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    val isDeviceOwner: Boolean
        get() = dpm.isDeviceOwnerApp(context.packageName)

    val isAdminActive: Boolean
        get() = dpm.isAdminActive(adminComponent)

    /**
     * Enforce Camera Disabled / Enabled on device via Android OS APIs
     */
    fun setCameraDisabled(disabled: Boolean): Boolean {
        if (!isAdminActive) {
            Log.w(TAG, "Cannot set camera disabled=$disabled: Admin privileges not active.")
            return false
        }
        return try {
            dpm.setCameraDisabled(adminComponent, disabled)
            prefs.edit().putBoolean(KEY_CAMERA_BLOCKED, disabled).apply()
            Log.i(TAG, "DevicePolicyManager -> Camera disabled set to: $disabled")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to toggle camera restriction: ${e.message}")
            false
        }
    }

    /**
     * Enforce Application Hiding / Unhiding on device (Device Owner feature)
     */
    fun setApplicationHidden(packageName: String, hidden: Boolean): Boolean {
        if (!isDeviceOwner) {
            Log.w(TAG, "Cannot hide package $packageName: App is not Android Device Owner.")
            return false
        }
        return try {
            val success = dpm.setApplicationHidden(adminComponent, packageName, hidden)
            Log.i(TAG, "DevicePolicyManager -> Package $packageName hidden=$hidden result: $success")
            success
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set application hidden for $packageName: ${e.message}")
            false
        }
    }

    /**
     * Enforce Screen Capture (Screenshot) Blocking
     */
    fun setScreenCaptureDisabled(disabled: Boolean): Boolean {
        if (!isAdminActive) return false
        return try {
            dpm.setScreenCaptureDisabled(adminComponent, disabled)
            prefs.edit().putBoolean(KEY_SCREENSHOT_BLOCKED, disabled).apply()
            Log.i(TAG, "DevicePolicyManager -> Screen capture disabled set to: $disabled")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disable screen capture: ${e.message}")
            false
        }
    }

    /**
     * Apply default Device Owner security restrictions
     */
    fun enforceDeviceOwnerDefaults() {
        if (!isDeviceOwner) return
        try {
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_ADD_USER)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_SAFE_BOOT)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_BLUETOOTH)
            Log.i(TAG, "Enforced enterprise Device Owner user restrictions.")
        } catch (e: Exception) {
            Log.e(TAG, "Error enforcing Device Owner restrictions: ${e.message}")
        }
    }

    /**
     * Apply full Work Mode Security Policy from JSON configuration
     */
    fun applyPolicyJson(json: JSONObject) {
        try {
            val cameraBlocked = json.optBoolean("cameraBlocked", true)
            val screenCaptureBlocked = json.optBoolean("screenCaptureBlocked", true)
            val developerOptionsBlocked = json.optBoolean("developerOptionsBlocked", true)

            setCameraDisabled(cameraBlocked)
            setScreenCaptureDisabled(screenCaptureBlocked)

            if (isDeviceOwner && developerOptionsBlocked) {
                dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_DEBUGGING_FEATURES)
            }

            // Block & Hide Apps
            val blockedApps: JSONArray? = json.optJSONArray("blockedApps")
            if (blockedApps != null && isDeviceOwner) {
                for (i in 0 until blockedApps.length()) {
                    val pkg = blockedApps.getString(i)
                    setApplicationHidden(pkg, true)
                }
            }

            prefs.edit().putString(KEY_LAST_POLICY_JSON, json.toString()).apply()
            Log.i(TAG, "Work Mode Security Policy successfully applied to device.")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse and apply policy JSON: ${e.message}")
        }
    }

    /**
     * Enforce Default Enterprise Blacklisted Apps (Facebook, TikTok, Instagram, YouTube, Gambling)
     */
    fun enforceDefaultAppBlacklist(hide: Boolean) {
        val defaultBlacklist = listOf(
            "com.facebook.katana",
            "com.zhiliaoapp.musically",
            "com.instagram.android",
            "com.google.android.youtube",
            "com.snapchat.android",
            "com.bovada.lv",
            "com.bet365"
        )
        for (pkg in defaultBlacklist) {
            setApplicationHidden(pkg, hide)
        }
    }

    fun enforceActivePolicy() {
        val lastJsonStr = prefs.getString(KEY_LAST_POLICY_JSON, null)
        if (lastJsonStr != null) {
            applyPolicyJson(JSONObject(lastJsonStr))
        } else {
            setCameraDisabled(true)
            enforceDefaultAppBlacklist(true)
        }
    }

    fun saveServerCredentials(serverUrl: String, token: String) {
        prefs.edit()
            .putString(KEY_SERVER_URL, serverUrl)
            .putString(KEY_ENROLLMENT_TOKEN, token)
            .apply()
    }

    fun getServerUrl(): String {
        return prefs.getString(KEY_SERVER_URL, "https://itms.nkbmanufacturing.com") ?: "https://itms.nkbmanufacturing.com"
    }

    companion object {
        private const val TAG = "NKB_ITMS_PolicyManager"
        private const val PREFS_NAME = "nkb_mdm_prefs"
        private const val KEY_CAMERA_BLOCKED = "camera_blocked"
        private const val KEY_SCREENSHOT_BLOCKED = "screenshot_blocked"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_ENROLLMENT_TOKEN = "enrollment_token"
        private const val KEY_LAST_POLICY_JSON = "last_policy_json"

        @Volatile
        private var instance: PolicyManager? = null

        fun getInstance(context: Context): PolicyManager {
            return instance ?: synchronized(this) {
                instance ?: PolicyManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
