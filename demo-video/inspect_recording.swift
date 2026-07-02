import AppKit
import AVFoundation

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let interval = CommandLine.arguments.count > 3 ? Double(CommandLine.arguments[3]) ?? 30 : 30
let asset = AVURLAsset(url: input)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 720, height: 405)
let duration = CMTimeGetSeconds(asset.duration)
let times = stride(from: 0.0, through: duration, by: interval).map {
    NSValue(time: CMTime(seconds: min($0, duration - 0.1), preferredTimescale: 600))
}
let columns = 3
let cellWidth = 720
let cellHeight = 445
let rows = Int(ceil(Double(times.count) / Double(columns)))
let canvas = NSImage(size: NSSize(width: columns * cellWidth, height: rows * cellHeight))
canvas.lockFocus()
NSColor.black.setFill()
NSRect(origin: .zero, size: canvas.size).fill()
for (index, value) in times.enumerated() {
    let time = value.timeValue
    guard let imageRef = try? generator.copyCGImage(at: time, actualTime: nil) else { continue }
    let image = NSImage(cgImage: imageRef, size: NSSize(width: cellWidth, height: 405))
    let column = index % columns
    let row = rows - 1 - index / columns
    let origin = NSPoint(x: column * cellWidth, y: row * cellHeight + 40)
    image.draw(in: NSRect(origin: origin, size: image.size))
    let label = String(format: "%02d:%02d", Int(CMTimeGetSeconds(time)) / 60, Int(CMTimeGetSeconds(time)) % 60)
    label.draw(
        at: NSPoint(x: origin.x + 16, y: origin.y - 32),
        withAttributes: [.font: NSFont.boldSystemFont(ofSize: 22), .foregroundColor: NSColor.white]
    )
}
canvas.unlockFocus()
guard
    let tiff = canvas.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiff),
    let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.82])
else { exit(1) }
try jpeg.write(to: output)
