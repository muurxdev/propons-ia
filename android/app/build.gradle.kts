import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val versao = rootProject.file("../VERSAO").readText().trim()
val partes = versao.split(".").map { it.toInt() }

// assinatura de release: vem de variáveis de ambiente (segredos do GitHub) ou de android/assinatura.properties (fora do Git)
val assinatura = Properties().apply {
    val f = rootProject.file("assinatura.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun segredo(chave: String, env: String): String? = System.getenv(env) ?: assinatura.getProperty(chave)

android {
    namespace = "io.github.muurxdev.proponsia"
    compileSdk = 35
    buildToolsVersion = "35.0.0"

    defaultConfig {
        applicationId = "io.github.muurxdev.proponsia"
        minSdk = 28            // o motor (llama.cpp) exige Android 9+
        targetSdk = 35
        versionCode = partes[0] * 10000 + partes[1] * 100 + partes[2]
        versionName = versao
        // release: só arm64 (celulares). PROPONS_X86_64=1 inclui x86_64 para testar no emulador.
        ndk { abiFilters += listOf("arm64-v8a") + (if (System.getenv("PROPONS_X86_64") == "1") listOf("x86_64") else emptyList()) }
    }

    signingConfigs {
        create("release") {
            val loja = segredo("arquivo", "PROPONS_KEYSTORE")
            if (loja != null && file(loja).exists()) {
                storeFile = file(loja)
                storePassword = segredo("senha", "PROPONS_KEYSTORE_SENHA")
                keyAlias = segredo("alias", "PROPONS_KEY_ALIAS") ?: "propons"
                keyPassword = segredo("senhaChave", "PROPONS_KEY_SENHA") ?: storePassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            val cfg = signingConfigs.getByName("release")
            // sem chave de release: só é aceitável em build local de teste. Numa release de verdade (CI com tag) é erro,
            // porque um APK assinado com a chave de debug impede quem já tem o app de atualizar.
            if (cfg.storeFile == null && System.getenv("PROPONS_EXIGIR_ASSINATURA") == "1") throw GradleException("release sem a chave de assinatura (PROPONS_KEYSTORE)")
            signingConfig = if (cfg.storeFile != null) cfg else signingConfigs.getByName("debug")
        }
    }

    // o motor é um executável empacotado como lib*.so: precisa ser extraído para poder rodar
    packaging { jniLibs { useLegacyPackaging = true } }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
