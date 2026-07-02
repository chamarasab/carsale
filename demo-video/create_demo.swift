import AppKit
import AVFoundation
import CoreImage
import CoreVideo

struct Segment {
    let image: String?
    let title: String
    let subtitle: String
}

let width = 1920
let height = 1080
let fps: Int32 = 30
let segmentDuration = 5.0
let outputDuration = 60.0

@main
struct DemoVideo {
    static func main() async throws {
        let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let frames = root.appendingPathComponent("demo-video/frames")
        let silentVideo = root.appendingPathComponent("demo-video/ceylon-jdm-demo-silent.mp4")
        let music = root.appendingPathComponent("demo-video/original-demo-music.wav")
        let output = root.appendingPathComponent("demo-video/Ceylon-JDM-Orders-Vendor-Demo.mp4")

        let segments = [
            Segment(image: nil, title: "CEYLON JDM ORDERS", subtitle: "Japan auction vehicles, priced for Sri Lanka"),
            Segment(image: "dashboard-clean.png", title: "Live Auction Catalogue", subtitle: "Search, compare mileage, grade, source and delivered price"),
            Segment(image: "car-detail-2.png", title: "Complete Vehicle Details", subtitle: "Auction dates, verified mileage, images and landed-cost estimate"),
            Segment(image: "car-landed-cost.png", title: "Every Cost Explained", subtitle: "CIF, duties, VAT, SSCL, local charges and buyer inquiry in one view"),
            Segment(image: "gallery-photo.jpg", title: "Multi-Image Preview", subtitle: "Full-screen gallery with next, previous and thumbnail navigation"),
            Segment(image: "admin-home-2.png", title: "One Administration Hub", subtitle: "Advertisements, approvals, users, tax settings and imports"),
            Segment(image: "admin-approvals-2.png", title: "Controlled Publishing", subtitle: "Every publisher advertisement waits for admin approval"),
            Segment(image: "admin-editor.png", title: "Advertisement Management", subtitle: "Create, edit, preview and manage complete auction listings"),
            Segment(image: "settings-bands.png", title: "Configurable Sri Lankan Pricing", subtitle: "Control tax percentages, thresholds and luxury bands"),
            Segment(image: "admin-scraper-2.png", title: "Two Auction Sources", subtitle: "Scheduled JP Center imports and manual A-Automarket searches"),
            Segment(image: "scraper-runs.png", title: "Visible Import History", subtitle: "Fetched, inserted, updated and error counts for every run"),
            Segment(image: nil, title: "READY FOR VENDOR APPROVAL", subtitle: "A clear, managed path from Japan auction to Sri Lankan buyer"),
        ]

        try? FileManager.default.removeItem(at: silentVideo)
        try? FileManager.default.removeItem(at: music)
        try? FileManager.default.removeItem(at: output)
        try renderVideo(segments: segments, frames: frames, output: silentVideo)
        try makeMusic(output: music, duration: outputDuration)
        try await combine(video: silentVideo, audio: music, output: output)
        print(output.path)
    }
}

func renderVideo(segments: [Segment], frames: URL, output: URL) throws {
    let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 8_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        ],
    ]
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: width,
            kCVPixelBufferHeightKey as String: height,
        ]
    )
    guard writer.canAdd(input) else { throw NSError(domain: "Demo", code: 1) }
    writer.add(input)
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    let ciContext = CIContext()
    let totalFrames = Int(outputDuration * Double(fps))
    for frameIndex in 0..<totalFrames {
        while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
        let seconds = Double(frameIndex) / Double(fps)
        let segmentIndex = min(Int(seconds / segmentDuration), segments.count - 1)
        let localProgress = (seconds - Double(segmentIndex) * segmentDuration) / segmentDuration
        guard let buffer = makePixelBuffer() else { continue }
        render(segment: segments[segmentIndex], progress: localProgress, frames: frames, buffer: buffer, ciContext: ciContext)
        adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(frameIndex), timescale: fps))
    }

    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    if writer.status != .completed {
        throw writer.error ?? NSError(domain: "Demo", code: 2)
    }
}

func makePixelBuffer() -> CVPixelBuffer? {
    var buffer: CVPixelBuffer?
    CVPixelBufferCreate(
        kCFAllocatorDefault,
        width,
        height,
        kCVPixelFormatType_32BGRA,
        [
            kCVPixelBufferCGImageCompatibilityKey: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey: true,
        ] as CFDictionary,
        &buffer
    )
    return buffer
}

func render(segment: Segment, progress: Double, frames: URL, buffer: CVPixelBuffer, ciContext: CIContext) {
    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(buffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else { return }

    context.setFillColor(NSColor(calibratedRed: 0.025, green: 0.055, blue: 0.16, alpha: 1).cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))

    if let imageName = segment.image,
       let image = CIImage(contentsOf: frames.appendingPathComponent(imageName)) {
        if imageName.hasSuffix(".png") {
            let crop = CGRect(x: 30, y: 94, width: 2880, height: 1620)
            let zoom = 1 + progress * 0.025
            let cropped = image.cropped(to: crop)
                .transformed(by: CGAffineTransform(translationX: -crop.minX, y: -crop.minY))
                .transformed(by: CGAffineTransform(scaleX: (2.0 / 3.0) * zoom, y: (2.0 / 3.0) * zoom))
            ciContext.render(cropped, to: buffer, bounds: CGRect(x: 0, y: 0, width: width, height: height), colorSpace: CGColorSpaceCreateDeviceRGB())
        } else {
            let scale = max(CGFloat(width) / image.extent.width, CGFloat(height) / image.extent.height)
            let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
            let x = (scaled.extent.width - CGFloat(width)) / 2
            let y = (scaled.extent.height - CGFloat(height)) / 2
            ciContext.render(
                scaled.cropped(to: CGRect(x: x, y: y, width: CGFloat(width), height: CGFloat(height))),
                to: buffer
            )
        }
        context.setFillColor(NSColor.black.withAlphaComponent(0.16).cgColor)
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        drawCaption(context: context, title: segment.title, subtitle: segment.subtitle)
    } else {
        drawTitleCard(context: context, title: segment.title, subtitle: segment.subtitle)
    }
}

func drawCaption(context: CGContext, title: String, subtitle: String) {
    context.setFillColor(NSColor.black.withAlphaComponent(0.78).cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: 185))
    context.setFillColor(NSColor(calibratedRed: 0.12, green: 0.78, blue: 0.82, alpha: 1).cgColor)
    context.fill(CGRect(x: 92, y: 40, width: 8, height: 105))
    drawText(title, in: CGRect(x: 130, y: 87, width: 1650, height: 60), size: 42, weight: .bold, color: .white, context: context)
    drawText(subtitle, in: CGRect(x: 132, y: 38, width: 1650, height: 45), size: 25, weight: .medium, color: NSColor.white.withAlphaComponent(0.78), context: context)
}

func drawTitleCard(context: CGContext, title: String, subtitle: String) {
    context.setFillColor(NSColor(calibratedRed: 0.08, green: 0.18, blue: 0.48, alpha: 1).cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.setFillColor(NSColor(calibratedRed: 0.05, green: 0.8, blue: 0.75, alpha: 1).cgColor)
    context.fillEllipse(in: CGRect(x: 180, y: 455, width: 118, height: 118))
    drawText("CJ", in: CGRect(x: 180, y: 486, width: 118, height: 60), size: 38, weight: .bold, color: .white, alignment: .center, context: context)
    drawText(title, in: CGRect(x: 350, y: 510, width: 1370, height: 100), size: 60, weight: .heavy, color: .white, context: context)
    drawText(subtitle, in: CGRect(x: 355, y: 440, width: 1350, height: 70), size: 30, weight: .medium, color: NSColor.white.withAlphaComponent(0.75), context: context)
}

func drawText(
    _ text: String,
    in rect: CGRect,
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
    value.draw(in: rect)
    NSGraphicsContext.restoreGraphicsState()
}

func makeMusic(output: URL, duration: Double) throws {
    let sampleRate = 44_100
    let channels = 2
    let sampleCount = Int(duration * Double(sampleRate))
    var pcm = Data(capacity: sampleCount * channels * 2)
    let chords: [[Double]] = [
        [130.81, 164.81, 196.00, 261.63],
        [110.00, 146.83, 174.61, 220.00],
        [98.00, 130.81, 164.81, 196.00],
        [116.54, 146.83, 174.61, 233.08],
    ]
    for sample in 0..<sampleCount {
        let t = Double(sample) / Double(sampleRate)
        let chord = chords[Int(t / 7.5) % chords.count]
        let fade = min(1, t / 2.5, (duration - t) / 3.5)
        let pulse = 0.72 + 0.28 * sin(2 * .pi * 0.125 * t)
        var value = 0.0
        for (index, frequency) in chord.enumerated() {
            value += sin(2 * .pi * frequency * t + Double(index) * 0.3) / Double(index + 2)
        }
        let sparkleFrequency = chord[Int(t * 2) % chord.count] * 2
        value += 0.16 * sin(2 * .pi * sparkleFrequency * t) * exp(-((t * 2).truncatingRemainder(dividingBy: 1)) * 5)
        let integer = Int16(max(-1, min(1, value * 0.11 * pulse * fade)) * Double(Int16.max))
        for _ in 0..<channels {
            var little = integer.littleEndian
            pcm.append(Data(bytes: &little, count: 2))
        }
    }
    var wav = Data()
    func append(_ string: String) { wav.append(string.data(using: .ascii)!) }
    func append32(_ value: UInt32) { var value = value.littleEndian; wav.append(Data(bytes: &value, count: 4)) }
    func append16(_ value: UInt16) { var value = value.littleEndian; wav.append(Data(bytes: &value, count: 2)) }
    append("RIFF"); append32(UInt32(36 + pcm.count)); append("WAVEfmt "); append32(16); append16(1)
    append16(UInt16(channels)); append32(UInt32(sampleRate)); append32(UInt32(sampleRate * channels * 2))
    append16(UInt16(channels * 2)); append16(16); append("data"); append32(UInt32(pcm.count)); wav.append(pcm)
    try wav.write(to: output)
}

func combine(video: URL, audio: URL, output: URL) async throws {
    let videoAsset = AVURLAsset(url: video)
    let audioAsset = AVURLAsset(url: audio)
    let composition = AVMutableComposition()
    guard
        let sourceVideo = try await videoAsset.loadTracks(withMediaType: .video).first,
        let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
        let sourceAudio = try await audioAsset.loadTracks(withMediaType: .audio).first,
        let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
    else { throw NSError(domain: "Demo", code: 3) }
    let duration = try await videoAsset.load(.duration)
    try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceVideo, at: .zero)
    try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceAudio, at: .zero)
    guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPreset1920x1080) else {
        throw NSError(domain: "Demo", code: 4)
    }
    exporter.outputURL = output
    exporter.outputFileType = .mp4
    exporter.shouldOptimizeForNetworkUse = true
    await withCheckedContinuation { continuation in
        exporter.exportAsynchronously { continuation.resume() }
    }
    if exporter.status != .completed {
        throw exporter.error ?? NSError(domain: "Demo", code: 5)
    }
}
