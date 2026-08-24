# api

Route Handlers. They exist for what a Server Action cannot do: streamed responses, webhooks and
anything a third party calls.

Two things to remember here: `next/root-params` does not work in a Route Handler, so the locale
is passed explicitly; and a Server Action is the right tool for mutations driven by the UI.
