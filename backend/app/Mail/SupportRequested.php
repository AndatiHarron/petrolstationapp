<?php

namespace App\Mail;

use App\Models\SupportRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * "Someone cannot sign in."
 *
 * Addressed to the platform owners. The reply-to is set to whoever asked, so
 * answering is a single tap rather than a copy-and-paste out of the body —
 * which matters because the person waiting cannot get into the system to chase
 * it.
 */
class SupportRequested extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public SupportRequest $supportRequest) {}

    public function envelope(): Envelope
    {
        $known = $this->supportRequest->user !== null;

        return new Envelope(
            subject: $known
                ? "Sign-in help requested by {$this->supportRequest->user->name}"
                : "Sign-in help requested for {$this->supportRequest->email}",
            replyTo: [$this->supportRequest->email],
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.support-requested',
            with: [
                'request' => $this->supportRequest,
                'account' => $this->supportRequest->user,
            ],
        );
    }
}
