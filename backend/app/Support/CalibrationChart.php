<?php

namespace App\Support;

class CalibrationChart
{
    /**
     * Turn a pasted calibration certificate into chart rows.
     *
     * A certificate is a two-column table of dip depth against volume, and it
     * runs to a hundred rows or more. Both editors in this system take one row
     * at a time, which is why a tank ends up with a placeholder chart or none
     * at all — and with no chart, no stock variance can be calculated.
     *
     * The hard part is that a comma or a space may be either the boundary
     * between the two columns or a thousands separator inside one of them, and
     * "10,145" alone cannot tell you which. So the column boundary is settled
     * first, strongest candidate wins, and only then is each field cleaned up.
     * A space used as a thousands separator is therefore only understood when
     * the columns are divided by something firmer than a single space.
     *
     * @return array<int, array{mm: float, liters: float}> sorted by depth, one row per depth
     */
    public static function parse(?string $text): array
    {
        $rows = [];

        foreach (preg_split('/\r\n|\r|\n/', (string) $text) as $line) {
            $row = self::parseLine($line);

            if ($row === null) {
                continue;
            }

            // Keyed by depth so a corrected row pasted below an earlier one
            // replaces it instead of producing two entries for one depth.
            $rows[(string) $row['mm']] = $row;
        }

        $rows = array_values($rows);

        usort($rows, static fn (array $a, array $b): int => $a['mm'] <=> $b['mm']);

        return $rows;
    }

    /**
     * @return array{mm: float, liters: float}|null
     */
    private static function parseLine(string $line): ?array
    {
        $line = trim($line);

        if ($line === '' || ! preg_match('/\d/', $line)) {
            return null;
        }

        $fields = self::splitIntoFields($line);

        $numbers = [];

        foreach ($fields as $field) {
            $value = self::toNumber($field);

            if ($value !== null) {
                $numbers[] = $value;
            }

            if (count($numbers) === 2) {
                break;
            }
        }

        if (count($numbers) < 2) {
            return null;
        }

        [$mm, $liters] = $numbers;

        // Both are physical quantities. A negative one means the line was a
        // rule, a page footer or a column of differences, not a measurement.
        if ($mm < 0 || $liters < 0) {
            return null;
        }

        return ['mm' => $mm, 'liters' => $liters];
    }

    /**
     * Split on the firmest separator the line offers, so that a weaker
     * character of the same kind is left alone inside a field.
     *
     * @return array<int, string>
     */
    private static function splitIntoFields(string $line): array
    {
        foreach (["\t", ';', '|'] as $separator) {
            if (str_contains($line, $separator)) {
                return explode($separator, $line);
            }
        }

        // Column alignment from a PDF or a fixed-width report. Checked before a
        // single space so that "10    1 250" reads as 10 and 1250.
        if (preg_match('/\S {2,}\S/', $line)) {
            return preg_split('/ {2,}/', $line);
        }

        if (preg_match('/\S\s\S/', $line)) {
            return preg_split('/\s+/', $line);
        }

        return explode(',', $line);
    }

    /**
     * Read one field as a number, discarding units, separators and stray
     * punctuation. Returns null when the field holds no digits at all.
     */
    private static function toNumber(string $field): ?float
    {
        if (! preg_match('/\d/', $field)) {
            return null;
        }

        $negative = str_starts_with(trim($field), '-');

        // Keep the digits and a single decimal point; commas and spaces at this
        // point are separating thousands, because the columns are already split.
        $cleaned = preg_replace('/[^0-9.]/', '', $field);

        if ($cleaned === '' || ! preg_match('/\d/', $cleaned)) {
            return null;
        }

        // A field like "1.250.5" is a paste artefact; take the first decimal
        // point as the real one.
        if (substr_count($cleaned, '.') > 1) {
            $first = strpos($cleaned, '.');
            $cleaned = substr($cleaned, 0, $first + 1)
                .str_replace('.', '', substr($cleaned, $first + 1));
        }

        $value = (float) $cleaned;

        return $negative ? -$value : $value;
    }
}
