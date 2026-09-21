// swift-tools-version:5.9
// Teste do motor do iOS (ios/ProponsIA/Motor.swift) rodando no macOS com o mesmo llama.xcframework.
// Uso (num Mac, depois de ios/preparar.sh):  cp ../ProponsIA/Motor.swift Sources/TesteMotor/ && swift run -c release TesteMotor <modelo.gguf>
import PackageDescription

let package = Package(
    name: "TesteMotor",
    platforms: [.macOS(.v13)],
    targets: [
        .binaryTarget(name: "llama", path: "../Frameworks/llama.xcframework"),
        .executableTarget(name: "TesteMotor", dependencies: ["llama"], path: "Sources/TesteMotor"),
    ]
)
