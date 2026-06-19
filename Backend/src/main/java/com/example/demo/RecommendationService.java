package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.util.*;

/**
 * [역할: 서비스 구현 - 핵심 비즈니스 로직 및 AI 서버 연동]
 * - 리액트의 데이터를 파이썬 FastAPI 스펙(height_cm, weight_kg, gender, file)에 맞게 변환하여 통신
 */
@Service
public class RecommendationService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${ai.server.url}")
    private String aiServerUrl; // application.properties에서 주입 (v1/analyze/body)

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper(); // JSON 파싱용 인스턴스

    public RecommendationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Map<String, Object> processRecommendation(UploadRequestDto dto) throws Exception {
        
        // 1. [리액트 JSON 파싱] userInfo 문자열에서 키, 몸무게, 성별 추출하기
        double heightCm = 175.0; // 기본값 방어 코드
        double weightKg = 70.0;
        String gender = "MALE";

        if (dto.getUserInfo() != null && !dto.getUserInfo().isEmpty()) {
            JsonNode rootNode = objectMapper.readTree(dto.getUserInfo());
            if (rootNode.has("height")) heightCm = rootNode.get("height").asDouble();
            if (rootNode.has("weight")) weightKg = rootNode.get("weight").asDouble();
            if (rootNode.has("gender")) {
                String rawGender = rootNode.get("gender").asText();
                // 파이썬이 원하는 대문자 포맷(MALE/FEMALE)으로 보정
                gender = rawGender.equalsIgnoreCase("female") ? "FEMALE" : "MALE";
            }
        }

        // 2. [로컬 파일 백업] 의류 이미지 및 전신 이미지 C/D 드라이브 저장 로직
        if (dto.getClothingImages() != null) {
            for (MultipartFile img : dto.getClothingImages()) {
                if (!img.isEmpty()) {
                    Path path = Paths.get(uploadDir + "clothing_" + img.getOriginalFilename());
                    Files.createDirectories(path.getParent());
                    Files.copy(img.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }

        String bodyFileName = "default_body.png";
        byte[] bodyFileBytes = null;

        if (dto.getFullBodyImage() != null && !dto.getFullBodyImage().isEmpty()) {
            MultipartFile bodyFile = dto.getFullBodyImage();
            bodyFileName = bodyFile.getOriginalFilename();
            bodyFileBytes = bodyFile.getBytes();

            Path path = Paths.get(uploadDir + "body_" + bodyFileName);
            Files.createDirectories(path.getParent());
            Files.copy(bodyFile.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
        } else {
            throw new IllegalArgumentException("전신 사진(fullBodyImage)이 누락되었습니다.");
        }

        // 3. [FastAPI 전송용 바구니 구성] 파이썬 main.py 파라미터명과 1:1 매칭
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        body.add("height_cm", heightCm);
        body.add("weight_kg", weightKg);
        body.add("gender", gender);
        
        final String finalFileName = bodyFileName;
        body.add("file", new ByteArrayResource(bodyFileBytes) {
            @Override
            public String getFilename() { return finalFileName; }
        });

        // 4. [통신 및 반환] AI 서버 호출 및 응답 수신
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(aiServerUrl, requestEntity, Map.class);

        return response.getBody();
    }
}