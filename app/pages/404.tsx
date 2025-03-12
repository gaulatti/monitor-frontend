const NotFound = () => {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen p-4'>
        <div className='max-w-md w-full space-y-8 text-center'>
          <h1 className='text-4xl font-bold'>404</h1>
          <h2 className='text-2xl font-semibold'>Page Not Found</h2>
          <p className='text-muted-foreground'>Oops! The page you're looking for doesn't exist or has been moved.</p>
        </div>
      </div>
    );
  };
  export { NotFound };