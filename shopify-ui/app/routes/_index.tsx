import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }: LoaderFunctionArgs) {
  // For embedded Shopify apps, handle authentication first
  try {
    await authenticate.admin(request);
    return redirect('/app/');
  } catch (error) {
    // If authentication fails, let Shopify handle the auth flow
    console.log('Root route authentication failed, will let Shopify handle:', error.message);
    return redirect('/app/');
  }
}

export default function Index() { 
  return null; 
}


