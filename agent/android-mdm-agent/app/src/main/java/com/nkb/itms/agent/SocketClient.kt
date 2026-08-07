package com.nkb.itms.agent

import android.content.Context
import android.os.Build
import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class SocketClient(private val context: Context) {

    private var socket: Socket? = null
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val policyManager = PolicyManager.getInstance(context)
    private val scheduler: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()

    fun connect() {
        val serverUrl = policyManager.getServerUrl()
        try {
            val opts = IO.Options()
            opts.reconnection = true
            opts.reconnectionAttempts = Int.MAX_VALUE
            opts.reconnectionDelay = 5000

            socket = IO.socket(serverUrl, opts)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.i(TAG, "Socket.IO connected to server: $serverUrl")
                val deviceId = getDeviceId()
                socket?.emit("mdm:register", JSONObject().put("deviceId", deviceId))
                pullDevicePolicy()
            }

            socket?.on("webfilter:command") { args ->
                if (args.isNotEmpty() && args[0] is JSONObject) {
                    handleCommand(args[0] as JSONObject)
                }
            }

            socket?.on("mdm:command") { args ->
                if (args.isNotEmpty() && args[0] is JSONObject) {
                    handleCommand(args[0] as JSONObject)
                }
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.w(TAG, "Socket.IO disconnected.")
            }

            socket?.connect()

            // Schedule heartbeat every 60 seconds
            scheduler.scheduleAtFixedRate({ sendTelemetryHeartbeat() }, 10, 60, TimeUnit.SECONDS)

        } catch (e: Exception) {
            Log.e(TAG, "Error connecting Socket.IO: ${e.message}")
        }
    }

    fun pullDevicePolicy() {
        val serverUrl = policyManager.getServerUrl()
        val deviceId = getDeviceId()
        val url = "$serverUrl/api/mdm/devices/$deviceId/policy"

        val request = Request.Builder()
            .url(url)
            .get()
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to pull device policy: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        val bodyStr = it.body?.string() ?: ""
                        Log.i(TAG, "Fetched device policy response: $bodyStr")
                        try {
                            val jsonObj = JSONObject(bodyStr)
                            if (jsonObj.optBoolean("success")) {
                                val data = jsonObj.optJSONObject("data")
                                val policy = data?.optJSONObject("policy") ?: data
                                if (policy != null) {
                                    policyManager.applyPolicyJson(policy)
                                }
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error parsing policy JSON: ${e.message}")
                        }
                    }
                }
            }
        })
    }

    private fun handleCommand(json: JSONObject) {
        val cmd = json.optString("command", json.optString("action"))
        Log.i(TAG, "Received MDM Command: $cmd")

        when (cmd) {
            "ENABLE_WORK_MODE" -> {
                policyManager.setCameraDisabled(true)
                policyManager.enforceDefaultAppBlacklist(true)
            }
            "DISABLE_WORK_MODE" -> {
                policyManager.setCameraDisabled(false)
                policyManager.enforceDefaultAppBlacklist(false)
            }
            "HIDE_CAMERA" -> policyManager.setCameraDisabled(true)
            "SHOW_CAMERA" -> policyManager.setCameraDisabled(false)
            "HIDE_APPS" -> policyManager.enforceDefaultAppBlacklist(true)
            "UNHIDE_APPS" -> policyManager.enforceDefaultAppBlacklist(false)
            "EMERGENCY_LOCK" -> policyManager.setCameraDisabled(true)
            "SYNC_POLICY" -> pullDevicePolicy()
        }
    }

    private fun sendTelemetryHeartbeat() {
        val serverUrl = policyManager.getServerUrl()
        val url = "$serverUrl/api/mdm/devices/telemetry"

        val deviceId = getDeviceId()
        val json = JSONObject().apply {
            put("deviceId", deviceId)
            put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}")
            put("androidVersion", Build.VERSION.RELEASE)
            put("isWorkModeActive", true)
            put("isCameraBlocked", true)
            put("batteryLevel", 95)
            put("timestamp", System.currentTimeMillis())
        }

        val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder().url(url).post(body).build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}
            override fun onResponse(call: Call, response: Response) { response.close() }
        })
    }

    private fun getDeviceId(): String {
        return Build.SERIAL.takeIf { it != "unknown" } ?: "DEV-${Build.MODEL.replace(" ", "-")}"
    }

    companion object {
        private const val TAG = "NKB_ITMS_SocketClient"
    }
}
