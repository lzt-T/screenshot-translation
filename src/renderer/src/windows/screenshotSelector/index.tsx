import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FullScreenContainer, OverlayPiece, SelectionBox, SizeInfo } from './style';
import { SendEnum } from '@src/type/ipc-constants';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 空截图选区 */
const EMPTY_SELECTION_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

/** 截图区域选择器 */
const ScreenshotSelector: React.FC = () => {
  // 是否正在绘制选区
  const [isDrawing, setIsDrawing] = useState(false);
  // 当前截图选区
  const [selectionRect, setSelectionRect] = useState<Rect>(EMPTY_SELECTION_RECT);
  // 当前截图窗口尺寸
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  // 是否展示选区过小提示
  const [showSmallSelectionTip, setShowSmallSelectionTip] = useState(false);

  // 不触发渲染的实时绘制状态
  const isDrawingRef = useRef(false);
  // 本次绘制的起始坐标
  const startPositionRef = useRef({ x: 0, y: 0 });
  // 本次绘制的最新选区
  const selectionRectRef = useRef<Rect>(EMPTY_SELECTION_RECT);
  // 选区过小提示定时器
  const smallTipTimerRef = useRef<number | null>(null);

  // 监听窗口大小变化
  useEffect(() => {
    /** 同步截图窗口尺寸 */
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // 初始化
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /** 重置当前绘制状态 */
  const resetSelection = useCallback(() => {
    isDrawingRef.current = false;
    selectionRectRef.current = EMPTY_SELECTION_RECT;
    setIsDrawing(false);
    setSelectionRect(EMPTY_SELECTION_RECT);
  }, []);

  /** 捕获指针并开始绘制 */
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // 本次绘制的起始坐标
    const startPosition = { x: event.clientX, y: event.clientY };
    // 本次绘制的初始选区
    const initialRect = { ...startPosition, width: 0, height: 0 };
    isDrawingRef.current = true;
    startPositionRef.current = startPosition;
    selectionRectRef.current = initialRect;
    setIsDrawing(true);
    setShowSmallSelectionTip(false);
    setSelectionRect(initialRect);
    event.currentTarget.setPointerCapture(event.pointerId);
    console.log('[ScreenshotSelector] Pointer down at:', startPosition);
  };

  /** 使用已捕获的指针更新选区 */
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return;
    // 本次绘制的起始坐标
    const startPosition = startPositionRef.current;
    // 当前指针横坐标
    const currentX = event.clientX;
    // 当前指针纵坐标
    const currentY = event.clientY;
    // 当前最新选区
    const nextRect = {
      x: Math.min(currentX, startPosition.x),
      y: Math.min(currentY, startPosition.y),
      width: Math.abs(currentX - startPosition.x),
      height: Math.abs(currentY - startPosition.y)
    };
    selectionRectRef.current = nextRect;
    setSelectionRect(nextRect);
  };

  /** 释放已捕获的指针并完成绘制 */
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    console.log('[ScreenshotSelector] Pointer up');
    isDrawingRef.current = false;
    setIsDrawing(false);

    // 指针释放时的最终选区
    const finalRect = {
      ...selectionRectRef.current,
      width: Math.max(0, selectionRectRef.current.width),
      height: Math.max(0, selectionRectRef.current.height)
    };

    if (finalRect.width > 5 && finalRect.height > 5) {
      console.log('[ScreenshotSelector] Selection complete, sending bounds:', finalRect);
      window.electron.ipcRenderer.send(SendEnum.SCREENSHOT_SELECTED, finalRect);
    } else {
      console.log('[ScreenshotSelector] Selection too small, cancelling');
      setShowSmallSelectionTip(true);
      if (smallTipTimerRef.current) {
        window.clearTimeout(smallTipTimerRef.current);
      }
      smallTipTimerRef.current = window.setTimeout(() => {
        setShowSmallSelectionTip(false);
      }, 1400);
    }
    selectionRectRef.current = EMPTY_SELECTION_RECT;
    setSelectionRect(EMPTY_SELECTION_RECT);
  };

  /** 指针捕获意外取消时重置绘制 */
  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetSelection();
  };

  // 处理 Esc 键取消
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      console.log('[ScreenshotSelector] ESC pressed, cancelling screenshot');
      resetSelection();
      console.log('取消截图');

      window.electron.ipcRenderer.send(SendEnum.SCREENSHOT_CANCEL)
    }
  }, [resetSelection]);

  // 添加和移除键盘监听器
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 卸载时清理定时器
  useEffect(() => {
    return () => {
      if (smallTipTimerRef.current) {
        window.clearTimeout(smallTipTimerRef.current);
      }
    };
  }, []);

  // 计算尺寸提示展示位置，避免遮挡选区核心区域
  const getSizeInfoStyle = useCallback(() => {
    // 提示框边距
    const PADDING = 8;
    // 提示框预估宽度
    const BOX_WIDTH = 110;
    // 提示框预估高度
    const BOX_HEIGHT = 30;
    // 提示框横坐标
    let left = selectionRect.x + selectionRect.width + PADDING;
    // 提示框纵坐标
    let top = selectionRect.y + selectionRect.height + PADDING;

    if (left + BOX_WIDTH > screenSize.width) {
      left = Math.max(PADDING, selectionRect.x - BOX_WIDTH - PADDING);
    }
    if (top + BOX_HEIGHT > screenSize.height) {
      top = Math.max(PADDING, selectionRect.y - BOX_HEIGHT - PADDING);
    }

    return {
      left: `${left}px`,
      top: `${top}px`
    };
  }, [screenSize.height, screenSize.width, selectionRect.height, selectionRect.width, selectionRect.x, selectionRect.y]);

  // 渲染覆盖层
  const renderOverlay = () => {
    // 当前截图窗口尺寸
    const { width: screenW, height: screenH } = screenSize;
    // 当前截图选区尺寸
    const { x, y, width, height } = selectionRect;
    // 未绘制或选区无效时，显示完整覆盖层
    if (!isDrawing || width <= 0 || height <= 0) {
      return <OverlayPiece $rect={{ x: 0, y: 0, width: screenW, height: screenH }} />;
    }
    // 计算选区周围四个矩形块的尺寸
    const topRect =    { x: 0,    y: 0,           width: screenW,         height: Math.max(0, y) };
    // 选区下方遮罩
    const bottomRect = { x: 0,    y: y + height,  width: screenW,         height: Math.max(0, screenH - (y + height)) };
    // 选区左侧遮罩
    const leftRect =   { x: 0,    y: y,           width: Math.max(0, x),               height: height };
    // 选区右侧遮罩
    const rightRect =  { x: x + width, y: y,      width: Math.max(0, screenW - (x + width)), height: height };
    return (
      <>
        <OverlayPiece $rect={topRect} />
        <OverlayPiece $rect={bottomRect} />
        <OverlayPiece $rect={leftRect} />
        <OverlayPiece $rect={rightRect} />
      </>
    );
  };

  return (
    <FullScreenContainer
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <SizeInfo style={{ left: '50%', top: '18px', transform: 'translateX(-50%)' }}>
        拖拽选择区域 · 松开完成 · Esc 取消
      </SizeInfo>
      {showSmallSelectionTip ? (
        <SizeInfo style={{ left: '50%', top: '50px', transform: 'translateX(-50%)' }}>
          选区过小，请重新选择
        </SizeInfo>
      ) : null}
      {renderOverlay()}
      {isDrawing && selectionRect.width > 0 && selectionRect.height > 0 && (
        <>
          <SelectionBox $rect={selectionRect} />
          <SizeInfo style={getSizeInfoStyle()}>
            {`${Math.round(selectionRect.width)} x ${Math.round(selectionRect.height)}`}
          </SizeInfo>
        </>
      )}
    </FullScreenContainer>
  );
};

export default ScreenshotSelector;
