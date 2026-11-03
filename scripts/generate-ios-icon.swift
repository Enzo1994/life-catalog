import AppKit
let size = 1024
let cg = CGContext(data:nil,width:size,height:size,bitsPerComponent:8,bytesPerRow:size*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(cgContext:cg,flipped:false)
NSColor.white.setFill(); NSBezierPath(rect:NSRect(x:0,y:0,width:size,height:size)).fill()
let scale = CGFloat(size)/108
func rect(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ r:CGFloat,_ g:CGFloat,_ b:CGFloat){NSColor(calibratedRed:r,green:g,blue:b,alpha:1).setFill();NSBezierPath(rect:NSRect(x:x*scale,y:y*scale,width:w*scale,height:h*scale)).fill()}
rect(27,29,24,52,0.835,0.882,0.784);rect(57,29,24,52,0.949,0.894,0.718)
let path=NSBezierPath();path.lineWidth=2.8*scale;path.lineCapStyle = .round;path.lineJoinStyle = .round
func point(_ x:CGFloat,_ y:CGFloat)->NSPoint{NSPoint(x:x*scale,y:(108-y)*scale)}
path.move(to:point(54,34));path.curve(to:point(27,30),controlPoint1:point(45,28),controlPoint2:point(37,28));path.line(to:point(27,75));path.curve(to:point(54,79),controlPoint1:point(37,73),controlPoint2:point(45,73));path.curve(to:point(81,75),controlPoint1:point(63,73),controlPoint2:point(71,73));path.line(to:point(81,30));path.curve(to:point(54,34),controlPoint1:point(71,28),controlPoint2:point(63,28));path.line(to:point(54,79));path.move(to:point(33,40));path.line(to:point(45,40));path.move(to:point(63,40));path.line(to:point(75,40));NSColor(calibratedRed:0.208,green:0.251,blue:0.176,alpha:1).setStroke();path.stroke()
NSGraphicsContext.restoreGraphicsState()
let bitmap=NSBitmapImageRep(cgImage:cg.makeImage()!)
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
