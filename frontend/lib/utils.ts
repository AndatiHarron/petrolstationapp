const READING_FORMAT = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 3 });

/**
 * A pump counter, grouped for reading at a glance.
 *
 * Readings arrive as a number from the API and as a string from a form field,
 * so both are accepted; anything that is not a number is passed through rather
 * than showing "NaN" where a reading should be.
 */
export const formatReading = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '—';

    const numeric = Number(value);

    return Number.isFinite(numeric) ? READING_FORMAT.format(numeric) : String(value);
};

/**
 * Flattens a form field's validation errors into one line.
 *
 * The filter used to narrow to `string | number`, which made the branch that
 * reads `.message` unreachable — and that is the branch Zod's errors actually
 * take, since they arrive as objects. Narrowing only away from null keeps all
 * three shapes reachable.
 */
export const getErrorMessage = (errors: unknown[], isTouched: boolean, isSubmitted: boolean): string => {
    if ((!isTouched && !isSubmitted) || !errors || errors.length === 0) return '';

    return errors
      .filter((error) => error != null && error !== '')
      .map((error) => {
        if (typeof error === 'string' || typeof error === 'number') return String(error);
        if (error !== null && typeof error === 'object' && 'message' in error) {
          return String((error as { message: unknown }).message);
        }
        return String(error);
      })
      .join(', ');
  };
