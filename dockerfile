# Use the official lightweight PHP-Apache image
FROM php:8.2-apache

# Install PostgreSQL, unzip, and git
RUN apt-get update && apt-get install -y libpq-dev unzip git \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Install Composer directly into the container from its official image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy all your project files into the web server's public directory
COPY . /var/www/html/

# Run composer install ignoring strict PHP environment checks
RUN composer install --no-interaction --optimize-autoloader --no-dev --ignore-platform-reqs

# Tell Apache your default home page route
RUN echo "DirectoryIndex site/guest/home.html" >> /etc/apache2/apache2.conf

# Automatically run the SQL file into the Postgres database on deployment
RUN PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /var/www/html/config/landscape.sql || true

# Expose port 80 so Render can route web traffic to it
EXPOSE 80