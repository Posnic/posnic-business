import ExpoModulesCore
import CommonCrypto

public final class PosnicPinCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PosnicPinCrypto")
    AsyncFunction("derive") { (pin: String, saltHex: String) throws -> String in
      guard pin.range(of: "^(?:[0-9]{4}|[0-9]{6})$", options: .regularExpression) != nil,
            saltHex.range(of: "^[a-f0-9]{96}$", options: .regularExpression) != nil else {
        throw NSError(domain: "PosnicPinCrypto", code: 1)
      }
      var salt: [UInt8] = stride(from: 0, to: saltHex.count, by: 2).map { offset in
        let start = saltHex.index(saltHex.startIndex, offsetBy: offset)
        return UInt8(saltHex[start..<saltHex.index(start, offsetBy: 2)], radix: 16)!
      }
      var password = Array(pin.utf8)
      var key = [UInt8](repeating: 0, count: 32)
      defer {
        for i in password.indices { password[i] = 0 }
        for i in salt.indices { salt[i] = 0 }
        for i in key.indices { key[i] = 0 }
      }
      let status = password.withUnsafeBytes { p in
        salt.withUnsafeBufferPointer { s in
          key.withUnsafeMutableBufferPointer { k in
            CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2),
              p.baseAddress!.assumingMemoryBound(to: Int8.self), p.count,
              s.baseAddress!, s.count,
              CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), 600_000, k.baseAddress!, k.count)
          }
        }
      }
      guard status == kCCSuccess else { throw NSError(domain: "PosnicPinCrypto", code: 2) }
      return key.map { String(format: "%02x", $0) }.joined()
    }
  }
}
