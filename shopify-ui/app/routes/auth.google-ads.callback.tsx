import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // The backend handles the OAuth callback and redirects here.
  // This route ensures the user lands back in the app with the
  // correct query parameters so the connect-google page can
  // display an appropriate banner.
  const url = new URL(request.url);
  const connected = url.searchParams.get("connected");
  const error = url.searchParams.get("error");

  if (connected) {
    return redirect("/app/connect-google?connected=true");
  }
  if (error) {
    return redirect(
      `/app/connect-google?error=${encodeURIComponent(error)}`,
    );
  }
  return redirect("/app/connect-google");
}
