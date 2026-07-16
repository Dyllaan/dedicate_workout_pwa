FROM nginx:alpine
COPY ./dist /usr/share/nginx/html
COPY ./docker/nginx.conf /etc/nginx/nginx.conf
COPY ./40-env-js.sh /docker-entrypoint.d/40-env-js.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-env-js.sh && chmod +x /docker-entrypoint.d/40-env-js.sh
EXPOSE 80
