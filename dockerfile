FROM php:apache
WORKDIR /
COPY . /var/www/html
RUN mv /var/www/html/configs/ports.conf /etc/apache2/ports.conf
RUN mv /var/www/html/configs/sites-default.conf /etc/apache2/sites-enabled/000-default.conf
RUN apt-get update && apt-get install vnstat
RUN echo 'ServerName 0.0.0.0' >> /etc/apache2/apache2.conf
EXPOSE 8000
CMD ["/usr/sbin/apache2ctl", "-D", "FOREGROUND"]

