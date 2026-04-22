
import React, { useEffect, useState } from 'react';
import { Menu, Instagram, Facebook, MapPin, X, Lock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = location.pathname === '/admin';

  // HOOKS MUST BE CALLED UNCONDITIONALLY
  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Conditional rendering MUST happen AFTER hooks are called
  if (isAdmin) {
    return <>{children}</>;
  }

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Acomodações', href: '/#chales' },
    { label: 'Galeria', href: '/galeria' },
  ];

  // Helper para renderizar link interno ou âncora
  const renderNavLink = (item: { label: string; href: string }, mobile: boolean = false) => {
    const baseClass = mobile 
      ? "block px-3 py-3 text-sm font-medium text-white hover:text-serra-accent border-l-2 border-transparent hover:border-serra-accent transition-colors uppercase tracking-wider"
      : `${scrolled || !isHome ? 'text-serra-dark hover:text-serra-accent' : 'text-white hover:text-serra-accent'} font-medium text-xs uppercase tracking-widest transition-colors`;

    if (item.href.startsWith('/')) {
      return (
        <Link key={item.label} to={item.href} className={baseClass}>
          {item.label}
        </Link>
      );
    }
    return (
      <a key={item.label} href={item.href} className={baseClass}>
        {item.label}
      </a>
    );
  };

  // Header styles based on state
  const headerClass = `fixed top-0 w-full z-50 transition-all duration-500 ${
    scrolled || !isHome 
      ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' 
      : 'bg-transparent py-6'
  }`;

  // Logo color logic: White on transparent (Hero), Copper on White (Scrolled)
  const logoMainClass = scrolled || !isHome ? 'text-serra-copper' : 'text-white';
  const logoSubClass = scrolled || !isHome ? 'text-serra-dark' : 'text-white/80';
  const burgerClass = scrolled || !isHome ? 'text-serra-dark' : 'text-white';

  return (
    <div className="min-h-screen flex flex-col font-sans text-serra-text bg-serra-light">
      {/* Header */}
      <header className={headerClass}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <div className="flex flex-col items-center">
                <h1 className={`font-display text-3xl font-bold tracking-tight leading-none ${logoMainClass} transition-colors`}>
                  CHALÉ
                </h1>
                <span className={`text-[8px] tracking-[0.2em] uppercase font-sans font-bold ${logoSubClass} mt-1 transition-colors`}>
                  Recanto da Serra - Ecopark
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8 items-center">
              {navItems.map((item) => renderNavLink(item, false))}
              <a 
                href="#contato"
                className="bg-serra-accent hover:bg-serra-copper text-white px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md"
              >
                Contato
              </a>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`${burgerClass} p-2 focus:outline-none transition-colors`}
                aria-label="Menu principal"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-serra-dark border-t border-white/10 shadow-xl transition-all duration-300 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => renderNavLink(item, true))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer id="contato" className="bg-serra-dark text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 border-b border-white/10 pb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex flex-col items-start mb-6">
                <h1 className="font-display text-4xl font-bold tracking-tight text-white mb-1">
                  CHALÉ
                </h1>
                <span className="text-[10px] tracking-[0.3em] uppercase font-sans text-serra-accent">
                  Recanto da Serra - Ecopark
                </span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed max-w-md mb-6 font-light">
                Sua casa na montanha. Uma experiência única de hospedagem focada no conforto, 
                privacidade e integração total com a natureza exuberante da Serra dos Matões.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-serra-accent">Localização</h4>
              <div className="space-y-4 text-sm text-white/70">
                <p className="flex items-start gap-3">
                  <MapPin size={18} className="text-serra-accent mt-0.5 flex-shrink-0"/> 
                  <span>Estrada da Serra, km 12<br/>Serra dos Matões, CE</span>
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-serra-accent">Social</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-serra-accent transition-all">
                  <Instagram size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-serra-accent transition-all">
                  <Facebook size={20} />
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40 uppercase tracking-wider">
            <p>&copy; {new Date().getFullYear()} Recanto da Serra.</p>
            <div className="flex gap-6 items-center">
              <a href="#" className="hover:text-white transition-colors">Políticas</a>
              <Link to="/admin" className="hover:text-white transition-colors flex items-center gap-1">
                <Lock size={10} /> Área Administrativa
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
