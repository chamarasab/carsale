import AppKit
import AVFoundation
import QuartzCore

struct Caption {
    let start: Double
    let end: Double
    let title: String
    let subtitle: String
}

let canvasSize = CGSize(width: 1920, height: 1080)
let titleDuration = 5.0
let sourceURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("demo-video/frames/Screen Recording 2026-07-01 at 9.39.23\u{202f}PM.mov")
let musicURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("demo-video/original-demo-music.wav")
let outputURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("demo-video/Ceylon-JDM-Orders-Screen-Recording-Final.mp4")

@main
struct FineTuneRecording {
    static func main() async throws {
        let source = AVURLAsset(url: sourceURL)
        guard let sourceVideo = try await source.loadTracks(withMediaType: .video).first else {
            throw NSError(domain: "FineTune", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
        }

        let composition = AVMutableComposition()
        guard let videoTrack = composition.addMutableTrack(
            withMediaType: .video,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
            throw NSError(domain: "FineTune", code: 2)
        }

        let firstRange = CMTimeRange(start: .zero, duration: CMTime(seconds: 12, preferredTimescale: 600))
        let secondRange = CMTimeRange(
            start: CMTime(seconds: 45, preferredTimescale: 600),
            duration: CMTime(seconds: 187, preferredTimescale: 600)
        )
        let thirdRange = CMTimeRange(
            start: CMTime(seconds: 248, preferredTimescale: 600),
            duration: CMTime(seconds: 118, preferredTimescale: 600)
        )

        var cursor = CMTime(seconds: titleDuration, preferredTimescale: 600)
        videoTrack.insertEmptyTimeRange(CMTimeRange(start: .zero, duration: cursor))

        var footageRanges: [CMTimeRange] = []
        for sourceRange in [firstRange, secondRange, thirdRange] {
            try videoTrack.insertTimeRange(sourceRange, of: sourceVideo, at: cursor)
            let inserted = CMTimeRange(start: cursor, duration: sourceRange.duration)
            footageRanges.append(inserted)
            cursor = CMTimeAdd(cursor, sourceRange.duration)
        }

        let outroStart = cursor
        let outroRange = CMTimeRange(
            start: outroStart,
            duration: CMTime(seconds: titleDuration, preferredTimescale: 600)
        )
        videoTrack.insertEmptyTimeRange(outroRange)
        let finalDuration = CMTimeAdd(outroStart, outroRange.duration)

        try await addLoopedMusic(to: composition, duration: finalDuration)

        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = canvasSize
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)

        var instructions: [AVVideoCompositionInstructionProtocol] = []
        instructions.append(instruction(for: CMTimeRange(start: .zero, duration: CMTime(seconds: titleDuration, preferredTimescale: 600)), track: videoTrack, transform: .identity))

        let naturalSize = try await sourceVideo.load(.naturalSize)
        let preferredTransform = try await sourceVideo.load(.preferredTransform)
        let scale = canvasSize.width / naturalSize.width
        let cropTransform = preferredTransform
            .concatenating(CGAffineTransform(scaleX: scale, y: scale))
            .concatenating(CGAffineTransform(translationX: 0, y: -112 * scale))

        for range in footageRanges {
            instructions.append(instruction(for: range, track: videoTrack, transform: cropTransform))
        }
        instructions.append(instruction(for: outroRange, track: videoTrack, transform: .identity))
        videoComposition.instructions = instructions

        let parent = CALayer()
        parent.frame = CGRect(origin: .zero, size: canvasSize)
        parent.backgroundColor = NSColor(calibratedRed: 0.025, green: 0.055, blue: 0.16, alpha: 1).cgColor
        parent.isGeometryFlipped = true

        let videoLayer = CALayer()
        videoLayer.frame = parent.bounds
        parent.addSublayer(videoLayer)

        addTitleCard(
            to: parent,
            start: 0,
            end: titleDuration,
            title: "CEYLON JDM ORDERS",
            subtitle: "Vendor product walkthrough",
            detail: "Newer Japanese auction vehicles, transparently priced for Sri Lanka",
            totalDuration: finalDuration.seconds
        )

        let captions = [
            Caption(start: 5, end: 17, title: "A NEWER JDM CAR, WITHIN REACH", subtitle: "Browse recent Japanese auction vehicles with delivered pricing for Sri Lanka"),
            Caption(start: 17, end: 47, title: "PREVIEW & MANAGE ADVERTISEMENTS", subtitle: "Review complete vehicle details before editing, approving or removing a listing"),
            Caption(start: 47, end: 77, title: "COMPLETE LISTING EDITOR", subtitle: "Maintain specifications, auction data, images, condition and pricing in one place"),
            Caption(start: 77, end: 92, title: "APPROVAL BEFORE PUBLISHING", subtitle: "Publisher submissions remain private until an administrator approves them"),
            Caption(start: 92, end: 152, title: "AUTOMATED AUCTION IMPORTS", subtitle: "Schedule JP Center searches and manually run A-Automarket imports with visible results"),
            Caption(start: 152, end: 187, title: "LIVE RESULTS & VEHICLE DETAILS", subtitle: "Track fetched and inserted records, then inspect mileage, auction dates and images"),
            Caption(start: 187, end: 204, title: "PUBLIC BUYER CATALOGUE", subtitle: "Customers can search current stock and compare delivered prices"),
            Caption(start: 204, end: 221, title: "CONFIGURABLE TAX & PRICING", subtitle: "Administrators control tax percentages, luxury bands and landed-cost settings"),
            Caption(start: 221, end: 246, title: "CONTROLLED ADVERTISEMENT REQUESTS", subtitle: "Preview, edit and approve every new advertisement from the administration panel"),
            Caption(start: 246, end: 322, title: "A CLEAR BUYING EXPERIENCE", subtitle: "Filter auction cars, compare key facts and open the full vehicle story"),
        ]
        for caption in captions {
            addCaption(caption, to: parent, totalDuration: finalDuration.seconds)
        }

        addTitleCard(
            to: parent,
            start: outroStart.seconds,
            end: finalDuration.seconds,
            title: "READY FOR VENDOR APPROVAL",
            subtitle: "CEYLON JDM ORDERS",
            detail: "Secure publishing  •  Transparent pricing  •  Automated auction imports",
            totalDuration: finalDuration.seconds
        )

        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
            postProcessingAsVideoLayer: videoLayer,
            in: parent
        )

        try? FileManager.default.removeItem(at: outputURL)
        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPreset1920x1080) else {
            throw NSError(domain: "FineTune", code: 3)
        }
        exporter.videoComposition = videoComposition
        exporter.outputURL = outputURL
        exporter.outputFileType = .mp4
        exporter.shouldOptimizeForNetworkUse = true

        await exporter.export()
        guard exporter.status == .completed else {
            throw exporter.error ?? NSError(domain: "FineTune", code: 4)
        }
        print(outputURL.path)
    }
}

func instruction(
    for range: CMTimeRange,
    track: AVCompositionTrack,
    transform: CGAffineTransform
) -> AVMutableVideoCompositionInstruction {
    let value = AVMutableVideoCompositionInstruction()
    value.timeRange = range
    value.backgroundColor = NSColor(calibratedRed: 0.025, green: 0.055, blue: 0.16, alpha: 1).cgColor
    let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
    layer.setTransform(transform, at: range.start)
    value.layerInstructions = [layer]
    return value
}

func addLoopedMusic(to composition: AVMutableComposition, duration: CMTime) async throws {
    let music = AVURLAsset(url: musicURL)
    guard let sourceAudio = try await music.loadTracks(withMediaType: .audio).first,
          let destination = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
          ) else { return }

    let musicDuration = try await music.load(.duration)
    var cursor = CMTime.zero
    while cursor < duration {
        let remaining = CMTimeSubtract(duration, cursor)
        let chunk = CMTimeMinimum(musicDuration, remaining)
        try destination.insertTimeRange(CMTimeRange(start: .zero, duration: chunk), of: sourceAudio, at: cursor)
        cursor = CMTimeAdd(cursor, chunk)
    }
}

func addCaption(_ caption: Caption, to parent: CALayer, totalDuration: Double) {
    let panel = CALayer()
    panel.frame = CGRect(x: 64, y: 850, width: 1792, height: 168)
    panel.contents = makeCaptionImage(title: caption.title, subtitle: caption.subtitle)
    panel.contentsGravity = .resize
    panel.cornerRadius = 8
    panel.masksToBounds = true
    panel.opacity = 0
    panel.add(opacityAnimation(start: caption.start, end: caption.end, total: totalDuration), forKey: "visibility")
    parent.addSublayer(panel)
}

func addTitleCard(
    to parent: CALayer,
    start: Double,
    end: Double,
    title: String,
    subtitle: String,
    detail: String,
    totalDuration: Double
) {
    let card = CALayer()
    card.frame = parent.bounds
    card.contents = makeTitleImage(title: title, subtitle: subtitle, detail: detail)
    card.contentsGravity = .resize
    card.opacity = 0
    card.add(opacityAnimation(start: start, end: end, total: totalDuration), forKey: "visibility")
    parent.addSublayer(card)
}

func makeCaptionImage(title: String, subtitle: String) -> CGImage? {
    makeImage(size: CGSize(width: 1792, height: 168)) { context in
        context.setFillColor(NSColor.black.withAlphaComponent(0.82).cgColor)
        context.fill(CGRect(x: 0, y: 0, width: 1792, height: 168))
        context.setFillColor(NSColor(calibratedRed: 0.05, green: 0.8, blue: 0.75, alpha: 1).cgColor)
        context.fill(CGRect(x: 0, y: 0, width: 8, height: 168))
        drawText(title, in: CGRect(x: 40, y: 85, width: 1680, height: 50), size: 34, weight: .bold, color: .white, context: context)
        drawText(subtitle, in: CGRect(x: 40, y: 34, width: 1680, height: 40), size: 23, weight: .medium, color: NSColor.white.withAlphaComponent(0.76), context: context)
    }
}

func makeTitleImage(title: String, subtitle: String, detail: String) -> CGImage? {
    makeImage(size: canvasSize) { context in
        context.setFillColor(NSColor(calibratedRed: 0.04, green: 0.10, blue: 0.28, alpha: 1).cgColor)
        context.fill(CGRect(origin: .zero, size: canvasSize))
        context.setFillColor(NSColor(calibratedRed: 0.05, green: 0.8, blue: 0.75, alpha: 1).cgColor)
        context.fillEllipse(in: CGRect(x: 210, y: 435, width: 126, height: 126))
        drawText("CJ", in: CGRect(x: 210, y: 465, width: 126, height: 60), size: 38, weight: .bold, color: .white, alignment: .center, context: context)
        drawText(title, in: CGRect(x: 390, y: 535, width: 1350, height: 88), size: 55, weight: .heavy, color: .white, context: context)
        drawText(subtitle, in: CGRect(x: 395, y: 475, width: 1320, height: 55), size: 29, weight: .semibold, color: NSColor(calibratedRed: 0.12, green: 0.85, blue: 0.80, alpha: 1), context: context)
        drawText(detail, in: CGRect(x: 395, y: 420, width: 1320, height: 55), size: 24, weight: .medium, color: NSColor.white.withAlphaComponent(0.68), context: context)
    }
}

func makeImage(size: CGSize, drawing: (CGContext) -> Void) -> CGImage? {
    guard let context = CGContext(
        data: nil,
        width: Int(size.width),
        height: Int(size.height),
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }
    drawing(context)
    return context.makeImage()
}

func drawText(
    _ text: String,
    in frame: CGRect,
    size: CGFloat,
    weight: NSFont.Weight,
    color: NSColor,
    alignment: NSTextAlignment = .left,
    context: CGContext
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
    let value = NSAttributedString(
        string: text,
        attributes: [
            .font: NSFont.systemFont(ofSize: size, weight: weight),
            .foregroundColor: color,
            .paragraphStyle: paragraph,
        ]
    )
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    value.draw(in: frame)
    NSGraphicsContext.restoreGraphicsState()
}

func opacityAnimation(start: Double, end: Double, total: Double) -> CAKeyframeAnimation {
    let fade = min(0.45, max(0.08, (end - start) * 0.08))
    let animation = CAKeyframeAnimation(keyPath: "opacity")
    animation.values = [0, 0, 1, 1, 0, 0]
    animation.keyTimes = [
        0,
        NSNumber(value: max(0, start / total)),
        NSNumber(value: min(1, (start + fade) / total)),
        NSNumber(value: max(0, (end - fade) / total)),
        NSNumber(value: min(1, end / total)),
        1,
    ]
    animation.duration = total
    animation.beginTime = AVCoreAnimationBeginTimeAtZero
    animation.fillMode = .both
    animation.isRemovedOnCompletion = false
    return animation
}
