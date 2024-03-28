import '../scss/styles.scss'

if (typeof(navigator.serviceWorker)!=='undefined'){
    console.log('Začenjam z registracijo service workerja');

    navigator.serviceWorker.register('../sw.js').then( (registracija)=>{
        console.log('Service worker registriran');
        console.log(registracija);

    }).catch( (err)=>{
        console.log('Ujej, ni šlo... ', err);
    });

}
