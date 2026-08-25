import type { TacticalCamera } from "../renderer/camera";

export interface InputHandlerOptions {
  getSelectedUnitIds: () => string[];
  getPlayerSide: () => string;
  onAssignGroup: (groupNum: number, unitIds: string[]) => void;
  onSelectGroup: (groupNum: number) => void;
  onHoldOrder: () => void;
  onEntrenchOrder: () => void;
  onRetreatOrder: () => void;
  onSetAttackMode: () => void;
  onClearSelection: () => void;
  onCenterCameraOnSelection: () => void;
  onCycleSelection: () => void;
}

export class KeyboardInputHandler {
  private options: InputHandlerOptions;
  private lastGroupKey: number | null = null;
  private lastGroupKeyTime = 0;
  private isAttached = false;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(options: InputHandlerOptions) {
    this.options = options;
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  public attach(): void {
    if (this.isAttached || typeof window === "undefined") return;
    window.addEventListener("keydown", this.boundKeyDown);
    this.isAttached = true;
  }

  public detach(): void {
    if (!this.isAttached || typeof window === "undefined") return;
    window.removeEventListener("keydown", this.boundKeyDown);
    this.isAttached = false;
  }

  public handleKeyEvent(e: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    preventDefault?: () => void;
    target?: unknown;
  }): void {
    const target = e.target as HTMLElement | undefined;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    const key = e.key.toUpperCase();

    // 1. Control Groups: 1-9 and Ctrl+1-9
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      e.preventDefault?.();
      if (e.ctrlKey || e.metaKey) {
        // Ctrl + [1-9]: Assign Group
        const selectedIds = this.options.getSelectedUnitIds();
        this.options.onAssignGroup(num, selectedIds);
      } else {
        // [1-9]: Select Group
        const now = Date.now();
        const isDoublePress =
          this.lastGroupKey === num && now - this.lastGroupKeyTime < 350;
        this.lastGroupKey = num;
        this.lastGroupKeyTime = now;

        this.options.onSelectGroup(num);

        if (isDoublePress) {
          this.options.onCenterCameraOnSelection();
        }
      }
      return;
    }

    // 2. Tactical command shortcuts
    switch (key) {
      case "A": // Attack mode
        e.preventDefault?.();
        this.options.onSetAttackMode();
        break;

      case "S": // Stop / Hold
      case "H": // Hold
        e.preventDefault?.();
        this.options.onHoldOrder();
        break;

      case "E": // Entrench
        e.preventDefault?.();
        this.options.onEntrenchOrder();
        break;

      case "R": // Retreat
        e.preventDefault?.();
        this.options.onRetreatOrder();
        break;

      case " ": // Space: Center on selection
        e.preventDefault?.();
        this.options.onCenterCameraOnSelection();
        break;

      case "TAB": // Tab: Cycle through selected units
        e.preventDefault?.();
        this.options.onCycleSelection();
        break;

      case "ESCAPE": // Escape: Clear selection / cancel mode
        e.preventDefault?.();
        this.options.onClearSelection();
        break;

      default:
        break;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.handleKeyEvent(e);
  }
}
