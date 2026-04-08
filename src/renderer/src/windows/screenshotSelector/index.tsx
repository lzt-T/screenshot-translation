import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FullScreenContainer, OverlayPiece, SelectionBox, SizeInfo } from './style';
import { SendEnum } from '@src/type/ipc-constants';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ScreenshotSelector: React.FC = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  // 是否展示选区过小提示
  const [showSmallSelectionTip, setShowSmallSelectionTip] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // 选区过小提示定时器
  const smallTipTimerRef = useRef<number | null>(null);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // 初始化
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 鼠标按下，开始绘制
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    window.electron.ipcRenderer.send(SendEnum.START_SCREENSHOT)
    const clientX = e.clientX;
    const clientY = e.clientY;
    console.log('[ScreenshotSelector] Mouse down at:', { clientX, clientY });
    setIsDrawing(true);
    setShowSmallSelectionTip(false);
    setStartPos({ x: clientX, y: clientY });
    setSelectionRect({ x: clientX, y: clientY, width: 0, height: 0 });
  };

  // 鼠标移动，更新选区
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawing) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const left = Math.min(currentX, startPos.x);
    const top = Math.min(currentY, startPos.y);
    setSelectionRect({ x: left, y: top, width, height });
  }, [isDrawing, startPos]);

  // 鼠标松开，完成绘制
  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    console.log('[ScreenshotSelector] Mouse up');
    setIsDrawing(false);

    const finalRect = {
        x: selectionRect.x,
        y: selectionRect.y,
        width: Math.max(0, selectionRect.width),
        height: Math.max(0, selectionRect.height)
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
    setSelectionRect({ x: 0, y: 0, width: 0, height: 0 }); // 重置选区

  }, [isDrawing, selectionRect]);

  // 处理 Esc 键取消
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      console.log('[ScreenshotSelector] ESC pressed, cancelling screenshot');
      if (isDrawing) {
          setIsDrawing(false);
          setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      }
      console.log('取消截图');

      window.electron.ipcRenderer.send(SendEnum.SCREENSHOT_CANCEL)
    }
  }, [isDrawing]);

  // 添加和移除全局事件监听器
  useEffect(() => {
    const wasDrawing = isDrawing;
    const upListener = handleMouseUp;
    const moveListener = handleMouseMove;

    if (wasDrawing) {
      // 在 window 上监听以捕获容器外的事件
      window.addEventListener('mousemove', moveListener);
      window.addEventListener('mouseup', upListener);
    }
    // 键盘监听器始终激活
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // 清理监听器
      if (wasDrawing) {
        window.removeEventListener('mousemove', moveListener);
        window.removeEventListener('mouseup', upListener);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawing, handleMouseMove, handleMouseUp, handleKeyDown]);

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
    let left = selectionRect.x + selectionRect.width + PADDING;
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
    const { width: screenW, height: screenH } = screenSize;
    const { x, y, width, height } = selectionRect;
    // 未绘制或选区无效时，显示完整覆盖层
    if (!isDrawing || width <= 0 || height <= 0) {
      return <OverlayPiece $rect={{ x: 0, y: 0, width: screenW, height: screenH }} />;
    }
    // 计算选区周围四个矩形块的尺寸
    const topRect =    { x: 0,    y: 0,           width: screenW,         height: Math.max(0, y) };
    const bottomRect = { x: 0,    y: y + height,  width: screenW,         height: Math.max(0, screenH - (y + height)) };
    const leftRect =   { x: 0,    y: y,           width: Math.max(0, x),               height: height };
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
    // 容器捕获初始 mousedown
    <FullScreenContainer ref={containerRef} onMouseDown={handleMouseDown}>
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
