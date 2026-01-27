export const getErrorMessage = (errors: unknown[], isTouched: boolean, isSubmitted: boolean): string => {
    if ((!isTouched && !isSubmitted) || !errors || errors.length === 0) return '';
    
    return errors
      .map((error) => {
        if (typeof error === 'string') return error;
        if (error && typeof error === 'object' && 'message' in error) {
          return String(error.message);
        }
        return String(error);
      })
      .filter(Boolean)
      .join(', ');
  };
