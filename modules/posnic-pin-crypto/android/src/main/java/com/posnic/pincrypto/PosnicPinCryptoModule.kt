package com.posnic.pincrypto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class PosnicPinCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PosnicPinCrypto")
    // Expo AsyncFunction executes on its native worker queue, not the JS/UI thread.
    AsyncFunction("derive") { pin: String, saltHex: String ->
      require(Regex("[0-9]{4}|[0-9]{6}").matches(pin))
      require(Regex("[a-f0-9]{96}").matches(saltHex))
      val salt = saltHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
      val password = pin.toCharArray()
      val spec = PBEKeySpec(password, salt, 600_000, 256)
      try {
        val key = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        try { key.joinToString("") { "%02x".format(it.toInt() and 0xff) } }
        finally { key.fill(0) }
      } finally {
        spec.clearPassword()
        password.fill('\u0000')
        salt.fill(0)
      }
    }
  }
}
