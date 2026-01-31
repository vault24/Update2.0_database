import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: 'Dashboard', path: '/' },
    { label: 'Class Routine', path: '/class-routine' },
    { label: 'Students', path: '/students' },
    { label: 'Notices', path: '/notices' },
  ];

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
    { icon: Github, href: 'https://github.com/errorburner', label: 'GitHub' },
  ];

  return (
    <footer className="px-4 md:px-6 lg:px-8 pb-4">
      <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-lg overflow-hidden">
        {/* Main Footer Content */}
        <div className="px-6 md:px-8 py-8 md:py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/20">
                  <img 
                    src="/image/SIPI.jpeg" 
                    alt="SIPI Logo" 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </div>
                <span className="font-bold text-lg text-foreground">SIPI Portal</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empowering students and teachers with modern educational technology for a better learning experience.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground uppercase tracking-wider text-sm">
                Quick Links
              </h3>
              <ul className="space-y-2.5">
                {quickLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground uppercase tracking-wider text-sm">
                Contact
              </h3>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="mailto:principal.spi@gmail.com" 
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <span className="p-1.5 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                    </span>
                    principal.spi@gmail.com
                  </a>
                </li>
                <li>
                  <a 
                    href="tel:+8802587752017" 
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <span className="p-1.5 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                    </span>
                    +8802587752017
                  </a>
                </li>
                <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="p-1.5 rounded-full bg-primary/10">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </span>
                  Sirajganj, Bangladesh
                </li>
              </ul>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground uppercase tracking-wider text-sm">
                Follow Us
              </h3>
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="p-2.5 rounded-full bg-muted/50 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-300 hover:scale-110 hover:shadow-md"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 bg-muted/30 px-6 md:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>© {currentYear} SIPI Portal. All rights reserved.</span>
            <div className="flex items-center gap-1.5">
              <span>Made with</span>
              <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 animate-pulse" />
              <span>by</span>
              <a
                href="https://errorburner.site"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Errorburner Team
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
