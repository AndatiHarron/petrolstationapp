<?php

namespace App\Exceptions;

use Exception;

/**
 * A shift close the rules refused.
 *
 * These are not faults. A meter that does not follow on from the last shift, a
 * closing reading below its opening, a photograph already used elsewhere — each
 * is the integrity checks doing exactly their job, and each is something the
 * person standing at the pump can look at and correct.
 *
 * They were being raised as plain exceptions and answered with a 500, which
 * says "the server broke" and carries no guidance. The supervisor saw a status
 * code and a button that appeared to do nothing, and the one sentence that
 * would have told them which nozzle to re-read never reached the screen.
 *
 * Separating them lets the refusal come back as a 422 with its reason intact,
 * and leaves 500 to mean what it should: something we did not anticipate.
 */
class ShiftReconciliationException extends Exception
{
    //
}
