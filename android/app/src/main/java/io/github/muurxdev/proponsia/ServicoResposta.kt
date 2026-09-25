package io.github.muurxdev.proponsia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Serviço em primeiro plano enquanto a IA está ligada com o app em segundo plano (tela apagada, outro app): o Android
 * não encerra o processo, e ao voltar a conversa está no mesmo lugar, com a IA pronta — ela só desliga ao fechar o app
 * (tirar dos recentes, ou "Desligar" na notificação) ou se o próprio sistema encerrar tudo.
 * Tipo "specialUse" (Android 14+): a geração acontece no próprio aparelho e não é sincronização de dados — o tipo
 * "dataSync" do ServicoDownload tem limite de tempo por dia no Android 15, que os downloads grandes já consomem.
 */
class ServicoResposta : Service() {

    companion object {
        private const val CANAL = "resposta"
        private const val ID = 3
        private const val DESLIGAR = "io.github.muurxdev.proponsia.DESLIGAR"
        @Volatile private var rodando = false

        fun iniciar(ctx: Context, respondendo: Boolean) {
            try { ctx.startForegroundService(Intent(ctx, ServicoResposta::class.java).putExtra("respondendo", respondendo)) } catch (_: Exception) {}
        }
        // troca o texto da notificação sem reiniciar o serviço (reiniciar de segundo plano o Android pode barrar)
        fun atualizar(ctx: Context, respondendo: Boolean) {
            if (!rodando) return
            try { ctx.getSystemService(NotificationManager::class.java).notify(ID, notificacao(ctx, respondendo)) } catch (_: Exception) {}
        }
        fun terminar(ctx: Context) { ctx.stopService(Intent(ctx, ServicoResposta::class.java)) }

        private fun notificacao(ctx: Context, respondendo: Boolean): Notification {
            val abrir = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val desligar = PendingIntent.getService(ctx, 1, Intent(ctx, ServicoResposta::class.java).setAction(DESLIGAR),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val b = Notification.Builder(ctx, CANAL)
                .setSmallIcon(R.drawable.ic_notificacao).setColor(0xFF7C5CFF.toInt())
                .setContentTitle("Própons IA")
                .setContentText(if (respondendo) "Respondendo…" else "IA ligada · a conversa continua de onde parou")
                .setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false)
                .setContentIntent(abrir)
                .addAction(Notification.Action.Builder(null, "Desligar a IA", desligar).build())
            if (respondendo) b.setProgress(0, 0, true)
            return b.build()
        }
    }

    override fun onBind(i: Intent?): IBinder? = null

    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        if (i?.action == DESLIGAR) {
            // "Desligar a IA": fecha o app de verdade (a Activity desliga o motor ao terminar); sem Activity, desliga aqui
            val a = MainActivity.ativa?.get()
            if (a != null && !a.isFinishing) {
                a.runOnUiThread { a.finishAndRemoveTask() }
            } else {
                MainActivity.encerrado = true
                val p = MainActivity.motor
                if (p != null) Thread { try { p.destroy(); p.waitFor() } catch (_: Exception) {} }.start()
            }
            rodando = false; stopSelf(); return START_NOT_STICKY
        }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CANAL, "IA em segundo plano", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Aparece enquanto a IA fica ligada com o app em segundo plano, para ela continuar pronta"; setShowBadge(false)
        })
        val n = notificacao(this, i?.getBooleanExtra("respondendo", false) == true)
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE) else startForeground(ID, n)
            rodando = true
        } catch (_: Exception) { rodando = false; stopSelf() }
        return START_NOT_STICKY
    }

    // tirou o app dos recentes: é fechar o app — a IA desliga junto
    override fun onTaskRemoved(rootIntent: Intent?) {
        MainActivity.encerrado = true; MainActivity.motor?.let { p -> try { p.destroy() } catch (_: Exception) {} }
        rodando = false; stopSelf()
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() { rodando = false; super.onDestroy() }
}
