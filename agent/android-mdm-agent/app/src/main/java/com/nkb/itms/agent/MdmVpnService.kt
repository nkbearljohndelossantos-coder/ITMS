package com.nkb.itms.agent

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log

class MdmVpnService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "Starting NKB Enterprise WebFilter VPN Sinkhole Service...")
        startVpnSinkhole()
        return START_STICKY
    }

    private fun startVpnSinkhole() {
        try {
            if (vpnInterface != null) return

            val builder = Builder()
                .setSession("NKB-WebFilter-VPN")
                .addAddress("10.0.0.2", 32)
                .addRoute("0.0.0.0", 0)
                .addDnsServer("1.1.1.1")

            vpnInterface = builder.establish()
            Log.i(TAG, "NKB WebFilter VPN Sinkhole successfully established.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to establish VPN Service: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        vpnInterface?.close()
        vpnInterface = null
        Log.i(TAG, "NKB WebFilter VPN Service destroyed.")
    }

    companion object {
        private const val TAG = "NKB_ITMS_VpnService"
    }
}
