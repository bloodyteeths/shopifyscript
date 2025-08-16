import * as React from 'react'

export function ClientOnly({ children, fallback = null }: { children: () => React.ReactNode, fallback?: React.ReactNode }){
  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(()=> setHydrated(true), [])
  return hydrated ? <>{children()}</> : <>{fallback}</>
}


