import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

const Location = () => {
  return (
    <div className="bg-serra-light/20 py-24 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-serra-accent/5 rounded-bl-[100px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
                
                {/* Left Side: Text and Connect Info */}
                <div className="w-full lg:w-1/2">
                    <div className="mb-2 uppercase tracking-widest text-serra-accent text-sm font-bold animate-fade-in">
                        Onde Estamos
                    </div>
                    
                    <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-serra-dark mb-6 leading-tight">
                        Refúgio na <br/>
                        <span className="italic font-light text-serra-accent">Serra dos Matões</span>
                    </h2>
                    
                    <p className="text-gray-600 text-lg md:text-xl font-light leading-relaxed mb-10 max-w-lg">
                        Estamos localizados em uma área privilegiada, proporcionando 
                        o silêncio necessário para o seu descanso e a vista mais 
                        deslumbrante da região. Prepare-se para uma experiência de 
                        total conexão com a natureza.
                    </p>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 mb-8 max-w-md transition-all hover:shadow-md">
                        <div className="bg-serra-light/50 p-3 rounded-full text-serra-accent flex-shrink-0">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-serra-dark text-lg">Endereço</h4>
                            <p className="text-gray-500 font-light mt-1">
                                Estrada da Serra, km 12 - Serra dos Matões, PI
                            </p>
                        </div>
                    </div>

                    <a 
                        href="https://maps.app.goo.gl/MRiFtdm5M9dbFqd19"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-serra-dark hover:bg-serra-accent text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 uppercase tracking-widest text-sm shadow-lg hover:shadow-serra-accent/40 active:scale-[0.98]"
                    >
                        <Navigation size={18} />
                        Como Chegar
                    </a>
                </div>

                {/* Right Side: Map */}
                <div className="w-full lg:w-1/2 relative group">
                    <div className="absolute -inset-4 bg-serra-light/30 rounded-[2rem] transform rotate-3 group-hover:rotate-1 transition-transform duration-500 -z-10"></div>
                    <div className="absolute -inset-4 bg-serra-accent/10 rounded-[2rem] transform -rotate-2 group-hover:-rotate-1 transition-transform duration-500 -z-10"></div>
                    
                    <div className="bg-white p-3 rounded-[1.5rem] shadow-2xl overflow-hidden relative border border-white/50 backdrop-blur-sm">
                        <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden relative bg-gray-100">
                             <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1378.576933217976!2d-41.446385149179434!3d-4.391839246828233!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7939b5096c0689f%3A0xc6e93e1d2c21a1cf!2sRecanto%20da%20Serra%20Eco%20Park!5e1!3m2!1spt-BR!2sbr!4v1776365846928!5m2!1spt-BR!2sbr" 
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }} 
                                allowFullScreen={false} 
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                                className="w-full h-full grayscale-[0.2] contrast-[1.1] hover:grayscale-0 transition-all duration-700"
                                title="Mapa da Serra dos Matões"
                            ></iframe>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default Location;
