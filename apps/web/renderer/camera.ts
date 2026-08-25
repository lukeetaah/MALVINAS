import type { Vec2 } from "@malvinas/simulation";

export interface CameraState {
  x: number; // World X coordinate at center of viewport
  y: number; // World Y coordinate at center of viewport
  zoom: number; // Scale factor (pixels per world unit)
  minZoom: number;
  maxZoom: number;
  worldWidth: number;
  worldHeight: number;
}

export class TacticalCamera {
  public x: number;
  public y: number;
  public zoom: number;
  public minZoom: number;
  public maxZoom: number;
  public worldWidth: number;
  public worldHeight: number;

  constructor(
    worldWidth = 100,
    worldHeight = 60,
    viewportWidth = 800,
    viewportHeight = 480,
  ) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.x = worldWidth / 2;
    this.y = worldHeight / 2;

    // Calculate fit-to-view zoom level
    const fitZoom = Math.min(
      viewportWidth / worldWidth,
      viewportHeight / worldHeight,
    );
    this.minZoom = Math.max(4, fitZoom * 0.75);
    this.maxZoom = 48;
    this.zoom = fitZoom > 0 ? fitZoom : 10;
  }

  /**
   * Translates world coordinate to canvas pixel coordinate.
   */
  worldToScreen(worldPos: Vec2, canvasWidth: number, canvasHeight: number): Vec2 {
    const screenX = (worldPos.x - this.x) * this.zoom + canvasWidth / 2;
    const screenY = (worldPos.y - this.y) * this.zoom + canvasHeight / 2;
    return { x: screenX, y: screenY };
  }

  /**
   * Translates canvas pixel coordinate to world coordinate.
   */
  screenToWorld(screenPos: Vec2, canvasWidth: number, canvasHeight: number): Vec2 {
    const worldX = (screenPos.x - canvasWidth / 2) / this.zoom + this.x;
    const worldY = (screenPos.y - canvasHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  /**
   * Pans the camera by a screen delta in pixels.
   */
  panByScreenDelta(dx: number, dy: number): void {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.clamp();
  }

  /**
   * Zooms around a specific screen anchor point (e.g. mouse cursor).
   */
  zoomAtScreenPoint(
    factor: number,
    screenAnchor: Vec2,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    const worldBefore = this.screenToWorld(screenAnchor, canvasWidth, canvasHeight);
    const newZoom = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, this.zoom * factor),
    );
    this.zoom = newZoom;
    const worldAfter = this.screenToWorld(screenAnchor, canvasWidth, canvasHeight);

    // Adjust camera center so world coordinate under cursor remains stationary
    this.x += worldBefore.x - worldAfter.x;
    this.y += worldBefore.y - worldAfter.y;
    this.clamp();
  }

  /**
   * Centers and fits the camera onto the entire map.
   */
  fitToMap(canvasWidth: number, canvasHeight: number): void {
    this.x = this.worldWidth / 2;
    this.y = this.worldHeight / 2;
    const fitZoom = Math.min(
      canvasWidth / this.worldWidth,
      canvasHeight / this.worldHeight,
    );
    this.minZoom = Math.max(4, fitZoom * 0.75);
    this.zoom = fitZoom;
    this.clamp();
  }

  private clamp(): void {
    const margin = 10;
    this.x = Math.max(-margin, Math.min(this.worldWidth + margin, this.x));
    this.y = Math.max(-margin, Math.min(this.worldHeight + margin, this.y));
  }
}
