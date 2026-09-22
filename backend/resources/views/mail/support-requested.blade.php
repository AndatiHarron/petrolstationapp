<x-mail::message>
# Someone cannot sign in

**{{ $request->email }}** asked for help from the sign-in screen
on {{ $request->created_at->format('D j M Y, H:i') }}.

@if ($account)
This address belongs to **{{ $account->name }}**{{ $account->station?->name ? ', at '.$account->station->name : '' }}.
@else
No account on this system uses that address. They may have mistyped it, or they
may never have been set up — worth checking before replying.
@endif

@if ($request->message)
<x-mail::panel>
{{ $request->message }}
</x-mail::panel>
@endif

Replying to this email goes straight back to them.

<x-mail::subcopy>
Sent automatically because you are a platform administrator. The request is
also recorded in the system, so it is not lost if this email is missed.
</x-mail::subcopy>
</x-mail::message>
