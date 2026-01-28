// src/lib/api-error.ts
import { AxiosError } from 'axios';

export const getApiErrorMessage = (error: unknown): string => {
    if (!error) return 'An unknown error occurred.';

    // 1. Check if it's an Axios Error
    if (error instanceof AxiosError) {
        // 2. Check if the server sent a specific message (Laravel standard)
        // Laravel usually sends { "message": "Invalid credentials." }
        if (error.response?.data?.message) {
            return error.response.data.message;
        }

        // 3. Fallback based on Status Codes
        switch (error.response?.status) {
            case 400:
                return 'Bad Request. Please check your input.';
            case 401:
                return 'Session expired. Please log in again.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'Resource not found.';
            case 422:
                return 'Validation failed. Please check the form for errors.';
            case 429:
                return 'Too many requests. Please slow down.';
            case 500:
                return 'Server error. Our team has been notified.';
            case 502:
            case 503:
                return 'Service unavailable. Please try again later.';
            default:
                // Return the raw text if we can't map it, or a generic fallback
                return error.message || 'Network error. Please check your connection.';
        }
    }

    // 4. Fallback for non-Axios errors (JS crashes)
    if (error instanceof Error) {
        return error.message;
    }

    return 'Something went wrong. Please try again.';
};