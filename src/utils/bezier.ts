/**
 * GhostBridge Human-Like Mouse Trajectory & Bezier Math
 * Generates natural mouse movement curves with cubic Bezier interpolation,
 * randomized control point offsets, micro-jitters, and human-like deceleration.
 * Pure TypeScript, safe for both Node.js drivers and browser workbench visualizer.
 */

export interface Point {
  x: number;
  y: number;
}

export interface TrajectoryPoint extends Point {
  timeMs: number;
  speed: number;
}

/**
 * Calculates a point along a Cubic Bezier curve at parameter t (0 <= t <= 1)
 */
export function cubicBezierPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const oneMinusT3 = oneMinusT2 * oneMinusT;
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    oneMinusT3 * p0.x +
    3 * oneMinusT2 * t * p1.x +
    3 * oneMinusT * t2 * p2.x +
    t3 * p3.x;

  const y =
    oneMinusT3 * p0.y +
    3 * oneMinusT2 * t * p1.y +
    3 * oneMinusT * t2 * p2.y +
    t3 * p3.y;

  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/**
 * Generates natural human-like mouse trajectory between two coordinates.
 */
export function generateHumanTrajectory(
  start: Point,
  target: Point,
  options: {
    steps?: number;
    deviationFactor?: number;
    jitterFactor?: number;
    baseDurationMs?: number;
  } = {}
): TrajectoryPoint[] {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const distance = Math.hypot(dx, dy);

  // Dynamic steps based on distance
  const steps = options.steps ?? Math.max(12, Math.min(48, Math.round(distance / 15)));
  const deviation = options.deviationFactor ?? 0.25;
  const jitter = options.jitterFactor ?? 1.5;
  const totalDuration = options.baseDurationMs ?? Math.max(180, Math.min(650, distance * 0.9));

  // Compute perpendicular vector for organic curve curvature
  const perpX = -dy;
  const perpY = dx;
  const perpNorm = Math.hypot(perpX, perpY) || 1;

  // Randomized control points with human drift
  const sign = Math.random() > 0.5 ? 1 : -1;
  const curveMagnitude = (distance * deviation) * sign;

  const p0: Point = { x: start.x, y: start.y };
  const p1: Point = {
    x: start.x + dx * 0.25 + (perpX / perpNorm) * curveMagnitude * (0.8 + Math.random() * 0.4),
    y: start.y + dy * 0.25 + (perpY / perpNorm) * curveMagnitude * (0.8 + Math.random() * 0.4),
  };
  const p2: Point = {
    x: start.x + dx * 0.75 + (perpX / perpNorm) * (curveMagnitude * 0.4) * (0.8 + Math.random() * 0.4),
    y: start.y + dy * 0.75 + (perpY / perpNorm) * (curveMagnitude * 0.4) * (0.8 + Math.random() * 0.4),
  };
  const p3: Point = { x: target.x, y: target.y };

  const points: TrajectoryPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    // Easing: ease-in-out curve for human acceleration and deceleration
    const progress = i / steps;
    // Smooth step easing
    const easedT = progress * progress * (3 - 2 * progress);

    const basePoint = cubicBezierPoint(p0, p1, p2, p3, easedT);

    // Add subtle biological micro-jitter, tapering off near target
    const jitterTaper = Math.sin(progress * Math.PI); // 0 at start, peak at mid, 0 at target
    const currentJitter = (Math.random() - 0.5) * jitter * jitterTaper;

    const x = Math.round(basePoint.x + currentJitter);
    const y = Math.round(basePoint.y + currentJitter);

    const timeMs = Math.round(easedT * totalDuration);
    const speed = i === 0 ? 0 : Math.round((distance / steps) * (1.5 - Math.abs(progress - 0.5)));

    points.push({ x, y, timeMs, speed });
  }

  // Ensure exact target is final point
  points[points.length - 1] = {
    x: target.x,
    y: target.y,
    timeMs: totalDuration,
    speed: 0,
  };

  return points;
}
