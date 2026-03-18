FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build-time API URLs (baked into env.js)
ARG USER_SERVICE_URL=http://localhost:3001
ARG DASHBOARD_SERVICE_URL=http://localhost:3002
ARG SETTINGS_SERVICE_URL=http://localhost:3003

# Copy frontend files
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY env.template.js /usr/share/nginx/html/

RUN USER_SERVICE_URL="$USER_SERVICE_URL" DASHBOARD_SERVICE_URL="$DASHBOARD_SERVICE_URL" SETTINGS_SERVICE_URL="$SETTINGS_SERVICE_URL" \
  envsubst '${USER_SERVICE_URL} ${DASHBOARD_SERVICE_URL} ${SETTINGS_SERVICE_URL}' \
  < /usr/share/nginx/html/env.template.js \
  > /usr/share/nginx/html/env.js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
