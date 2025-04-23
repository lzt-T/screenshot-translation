function getErrorMessage(error: unknown): string {
  let errorMessage = '发生未知错误';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    try {
      // 尝试序列化，避免循环引用等问题
      errorMessage = JSON.stringify(error, null, 2); 
    } catch {
      // 序列化失败，使用默认消息
    }
  }
  return errorMessage;
}

export { getErrorMessage };
