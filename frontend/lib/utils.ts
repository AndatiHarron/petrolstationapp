export const getErrorMessage = (errors: unknown[], isTouched: boolean, isSubmitted: boolean): string => {
    if ((!isTouched && !isSubmitted) || !errors || errors.length === 0) return '';
    
    return errors
      .filter((error): error is string | number => error != null && error !== '')
      .map((error) => {
        if (typeof error === 'string' || typeof error === 'number') return String(error);
        if (error && typeof error === 'object' && 'message' in error) {
          return String(error.message);
        }
        return String(error);
      })
      .join(', ');
  };
