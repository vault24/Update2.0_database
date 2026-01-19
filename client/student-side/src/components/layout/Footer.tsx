import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin, Facebook, Linkedin, Github, Twitter } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto mx-4 mb-4 rounded-2xl shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/spi-logo.png" alt="SPI Logo" className="w-8 h-8" />
              <span className="font-display font-bold text-lg">SIPI Portal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Empowering students and teachers with modern educational technology for a better learning experience.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/dashboard/routine" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Class Routine
              </Link>
              <Link to="/dashboard/study-materials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Study Materials
              </Link>
              <Link to="/dashboard/notices" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Notices
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide">Contact</h4>
            <div className="flex flex-col gap-2">
              <a href="mailto:info@spi.edu" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" />
                principal.spi@gmail.com
              </a>
              <a href="tel:+880123456789" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +8802587752017
              </a>
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Sirajganj, Bangladesh
              </span>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide">Follow Us</h4>
            <div className="flex items-center gap-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            © {currentYear} SIPI Portal. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-destructive fill-destructive" /> by <a href= "https://errorburner.site/" > Errorburner Team </a> 
          </p>
        </div>
      </div>
    </footer>
  );
}
