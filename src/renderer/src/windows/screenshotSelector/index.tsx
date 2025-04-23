import React, { useState, useEffect, useRef, useCallback, StrictMode } from 'react';
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

  const containerRef = useRef<HTMLDivElement>(null);

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
    const clientX = e.clientX;
    const clientY = e.clientY;
    console.log('[ScreenshotSelector] Mouse down at:', { clientX, clientY });
    setIsDrawing(true);
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
      // ipcRenderer.send('SCREENSHOT_CANCEL');
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
      {renderOverlay()} 
      {isDrawing && selectionRect.width > 0 && selectionRect.height > 0 && (
        <>
          <SelectionBox $rect={selectionRect} />
          <SizeInfo style={{ left: `${selectionRect.x + selectionRect.width + 5}px`, top: `${selectionRect.y + selectionRect.height + 5}px` }}>
            {`${Math.round(selectionRect.width)} x ${Math.round(selectionRect.height)}`}
          </SizeInfo>
        </>
      )}
    </FullScreenContainer>
  );
};

export default ScreenshotSelector; 