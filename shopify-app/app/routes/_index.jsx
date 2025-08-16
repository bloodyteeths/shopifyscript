export default function Index(){
  if (typeof window !== 'undefined') {
    window.location.replace('/app/autopilot');
  }
  return null;
}


