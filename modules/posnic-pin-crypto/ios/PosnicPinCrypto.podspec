Pod::Spec.new do |s|
  s.name = 'PosnicPinCrypto'
  s.version = '1.0.0'
  s.summary = 'Background native PIN key derivation for Posnic Business'
  s.description = s.summary
  s.license = 'AGPL-3.0-only'
  s.author = 'Sridhar Bala'
  s.homepage = 'https://github.com/Posnic/posnic-business'
  s.source = { :git => 'https://github.com/Posnic/posnic-business.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
