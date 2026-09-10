# Use the official lightweight PHP-Apache image
FROM php:8.2-apache

# Install PostgreSQL dependencies and extensions
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Copy all your project files into the web server's public directory
COPY . /var/www/html/
RUN echo "DirectoryIndex site/guest/home.html" >> /etc/apache2/apache2.conf

# Expose port 80 so Render can route web traffic to it
EXPOSE 80