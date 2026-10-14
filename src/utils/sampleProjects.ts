import { Project } from '../types/flux';

/**
 * Generate starter sample animation projects for new artists
 */
export function createBouncingBallSample(): Project {
  const w = 640;
  const h = 480;
  const frameCount = 8;
  const frames = [];

  // Generate 8-frame classic squash & stretch bouncing ball
  const ballPositions = [
    { x: 320, y: 100, rx: 28, ry: 28 }, // 1. Peak
    { x: 320, y: 180, rx: 26, ry: 30 }, // 2. Falling
    { x: 320, y: 280, rx: 24, ry: 34 }, // 3. Accelerating
    { x: 320, y: 390, rx: 42, ry: 18 }, // 4. SQUASH on ground
    { x: 320, y: 310, rx: 24, ry: 34 }, // 5. Rebound stretch
    { x: 320, y: 210, rx: 26, ry: 30 }, // 6. Rising
    { x: 320, y: 140, rx: 28, ry: 28 }, // 7. Slowing down
    { x: 320, y: 105, rx: 28, ry: 28 }, // 8. Near apex
  ];

  for (let i = 0; i < frameCount; i++) {
    const fId = `sample_ball_f_${i + 1}`;
    const bgLayerId = `sample_ball_bg_${i + 1}`;
    const artLayerId = `sample_ball_art_${i + 1}`;

    // Render artwork canvas to dataUrl
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;

    // Ground line
    ctx.strokeStyle = '#3f434d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(120, 400);
    ctx.lineTo(520, 400);
    ctx.stroke();

    // Ball
    const pos = ballPositions[i];
    ctx.save();
    ctx.fillStyle = '#ff3366'; // Vibrant coral/pink matching reference
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, pos.rx, pos.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shading highlight
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(pos.x - pos.rx * 0.3, pos.y - pos.ry * 0.3, pos.rx * 0.25, pos.ry * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const artDataUrl = c.toDataURL('image/png');

    frames.push({
      id: fId,
      duration: 1,
      layers: [
        {
          id: bgLayerId,
          name: 'Background',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over' as const,
          alphaLock: false,
        },
        {
          id: artLayerId,
          name: 'Ball Lineart',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over' as const,
          alphaLock: false,
          dataUrl: artDataUrl,
        },
      ],
    });
  }

  return {
    version: 1,
    id: 'sample_bouncing_ball',
    title: 'Bouncing Ball (Squash & Stretch)',
    width: w,
    height: h,
    fps: 12,
    backgroundColor: '#ffffff',
    frames,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
