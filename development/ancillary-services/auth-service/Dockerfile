# Copyright 2022 Cisco and its affiliates
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0

# --- base image

FROM node:16-alpine3.12

# --- source code

WORKDIR /home/auth-service
COPY ./auth-service/ .

# --- environment

ENV ISSUER=bit-broker.io
ENV NODE_ENV=development
ENV LOG_LEVEL=debug
ENV SERVER_PORT=8080
ENV JWKS='{"keys":[{"kty":"RSA","kid":"PgL3TjODyXSnHnzd3pnMzXGCTeOzu6L1CedT82VB6YU","use":"sig","alg":"RS256","e":"AQAB","n":"wT4uVdqTm0wvfUW4kD9AxED3wo1Qa7tJxEP7O0cDQkfbxJw_S551IajUkfLzhW6tRb6BPJoYBvvjqnmVtrFo4yPikMjN99WHPfeDHnDxTNDsxNqGe9lAwpG929s6Sciam75SEVydMXb2dA9Wwe3BNGPYZL1d1KhJ-0-E50YBGRaaHXN4485-Cq9unYJc6QszJNVG6TCbyM9fG1v4esCJFG84lTPmbmU2kU8OckyeBZx9mocDY5MDjT-mUrTu8iS6THMAmQ4N4KoGF1EnbJKZNexdLQ75Bqbrv-o008fGjYEM5agHAZRGcRJDfzOnknLD1p-Uvb62G-Q_xlwqhCg6nw","d":"qWjH2kBK0wSRRXOP__VT5DlIe2jDrg589vDaGPeCZeL1SYHpA3QhH6cQ4_pnfvyuLsx6JBS7J7Q_vL3mgEk7uJVHFMLVvoWVkL-iVVeSU1N9nn4tE_o8CdcW6N1iVjjlQdAxxkK5FBpEqS6hUlYK4ND_biGNVtdKNGVcEByQ7doYHwsp1dHju3Mmy1NHj1JtIl2nspeDUNXSufpX7GuR1bEulNdHNrK0xdt4RhB2Ib59mFSSNnmpJRB16PIcv2hn7qslm23AbaUOZxYMYiX6nGX0t0SbvdouYouwxBsgZ0oFLViV45r_eKkyhwSZ__r1EaNu_wgucrvZiLdfXY-AUQ","p":"-a4zJrxgNuH5_A4EbTzEYr7Fy8iuMvqweA9X-PyPQ8Q-2aDcY5gaC2y_O0eTuSxf4YYevutM0IIYP_8pNxZyusLjHrXxC_JEJvM9Skoo2j6eDf1nx6vkzOXf_3tE7_9Q0xTi5uSc2sw02GVY4mqAbT17t_PzsrH6Vf59Et6GR10","q":"xiJLgDsbyVKv0sH-MfZ2-Dq8_v0wFei3Zc3-8hYwWgtsaARvxJPAgiAPeOeUdDu7h6ak1hr9S9mSfA4gEaS5Y4TzMxYCdfzz4n2yxEeJYyGvtPDbX7gI-YAfa7cv5Y980WJ91kfcxTb7wbOnGMvsJicbSWrGCwUh669uoREVVis","dp":"wgImJPdDG-JDySNrNSZ-wuvR7iMlmN9KuD_T79jvyYx3-csQ9SJ_OllpzrozgzOD3U3GHjvgGDS-exvd_rwmshA1QuvFPa8mXc2r1koBrHPzhJNfTLu4sa39fBtg2cveFeao2RjS-QCsH2nAw05WNIwN0kZxGm1JRADXVw4p8NE","dq":"c1ezrEq8uk6wnHjiiiN4zrkjHS43uAlp-pIZQMU6ELFlwogSqNV61EXlu_TUr3W2jhmtDBdaLbXTWPTAJoVGh3D2Q18kv5sqP0f9sdYTXOpXZ3ZvvyFb2COGJybVc0Y824gCyaO8GfMQTItRU1Yje3J4qBzIfdHXFWVjedCAI1E","qi":"y27S9TAabrZQL9_KTpPzn6ocOAgeiQFsul8iAlg-hWI31lnGEEAAifAEMfCri1NH91RDWK4UFcgn9eNJhc1wdiUbmIhaQQ8fgAGrSYy_vo9q8QPjzNxkcFCi2y9q1p73BN6FLI7nDyQ4n27YSICbTS84lrPGvLbFlomKbAkVtGs"}]}'

# --- prepare service

RUN npm install

# --- start service

EXPOSE 8080
CMD ["node", "--max-old-space-size=4096", "server.js"]
