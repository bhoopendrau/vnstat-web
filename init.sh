chown -R vnstat:vnstat /var/lib/vnstat
service vnstat start
/usr/sbin/apache2ctl -D FOREGROUND