package com.nkb.itms.agent

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PersistableBundle
import android.util.Log
import android.widget.Toast

class AdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "NKB ITMS Device Admin Enabled successfully.")
        Toast.makeText(context, "NKB ITMS Work Mode Security Admin Activated", Toast.LENGTH_LONG).show()
        
        // Initial policy enforcement
        PolicyManager.getInstance(context).enforceActivePolicy()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w(TAG, "NKB ITMS Device Admin Disabled.")
        Toast.makeText(context, "NKB ITMS Admin Privilege Disabled", Toast.LENGTH_LONG).show()
    }

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        super.onProfileProvisioningComplete(context, intent)
        Log.i(TAG, "Android Enterprise Profile Provisioning Complete.")

        val extras: PersistableBundle? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE, PersistableBundle::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE)
        }

        if (extras != null) {
            val serverUrl = extras.getString("serverUrl")
            val enrollmentToken = extras.getString("enrollmentToken")
            Log.i(TAG, "Received provisioning extras -> ServerUrl: $serverUrl, Token: $enrollmentToken")

            if (!serverUrl.isNullOrEmpty() && !enrollmentToken.isNullOrEmpty()) {
                PolicyManager.getInstance(context).saveServerCredentials(serverUrl, enrollmentToken)
            }
        }

        // Apply Device Owner Restrictions immediately
        PolicyManager.getInstance(context).enforceDeviceOwnerDefaults()
    }

    companion object {
        private const val TAG = "NKB_ITMS_AdminReceiver"

        fun getComponentName(context: Context): android.content.ComponentName {
            return android.content.ComponentName(context.applicationContext, AdminReceiver::class.java)
        }
    }
}

