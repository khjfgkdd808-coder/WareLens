package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

@Service
public class RecommendationService {

    @Value("${file.upload-dir}") private String uploadDir;
    @Value("${ai.clip.url}") private String aiClipUrl;
    @Value("${ai.mediapipe.url}") private String aiMediaPipeUrl;

    private final Map<String, Map<String, Object>> taskCache = new ConcurrentHashMap<>();
    // [추가] 피팅 결과 전용 캐시
    private final Map<String, Map<String, Object>> fittingCache = new ConcurrentHashMap<>();
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public RecommendationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }

    // [추가] 캐시 기반 피팅 로직
    public Map<String, Object> getOrCreateFitting(String userId, Map<String, Object> garmentInfo) {
        String garmentName = (String) garmentInfo.get("image_name");
        String cacheKey = userId + "_" + garmentName;

        // 캐시에 있으면 즉시 반환
        if (fittingCache.containsKey(cacheKey)) {
            System.out.println(">>> [LOG] 캐시에서 피팅 결과 반환: " + cacheKey);
            return fittingCache.get(cacheKey);
        }

        // 없으면 AI 서버 호출
        System.out.println(">>> [LOG] AI 서버 신규 피팅 요청: " + cacheKey);
        String tryOnUrl = getAiTryOnUrl();
        MultiValueMap<String, Object> tryOnBody = new LinkedMultiValueMap<>();
        tryOnBody.add("user_id", userId);
        tryOnBody.add("garment_name", garmentName);

        ResponseEntity<Map> response = restTemplate.postForEntity(tryOnUrl, new HttpEntity<>(tryOnBody), Map.class);
        Map<String, Object> result = response.getBody();

        // 캐시에 저장 후 반환
        if (result != null) {
            fittingCache.put(cacheKey, result);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> processRecommendation(UploadRequestDto dto) throws Exception {
        saveToNewFolder(dto);

        // STEP 1. CLIP 호출
        HttpHeaders clipHeaders = new HttpHeaders();
        clipHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> clipBody = new LinkedMultiValueMap<>();
        if (dto.getClothingImages() != null) {
            for (MultipartFile img : dto.getClothingImages()) {
                final String fileName = img.getOriginalFilename();
                clipBody.add("style_images", new ByteArrayResource(img.getBytes()) { @Override public String getFilename() { return fileName; } });
            }
        }
        ResponseEntity<Map> clipResponse = restTemplate.postForEntity(aiClipUrl, new HttpEntity<>(clipBody, clipHeaders), Map.class);
        Map<String, Object> clipResult = clipResponse.getBody();

        // [수정: 데이터 확인용 로그 추가]
        System.out.println("DEBUG - CLIP 데이터 구조: " + clipResult);

        // STEP 2. MediaPipe 호출
        String userId = "user_" + UUID.randomUUID().toString().substring(0, 8);
        double heightCm = 175.0;
        String gender = "MALE";
        if (dto.getUserInfo() != null && !dto.getUserInfo().trim().isEmpty()) {
            JsonNode jsonNode = objectMapper.readTree(dto.getUserInfo());
            if (jsonNode.has("userId")) userId = jsonNode.get("userId").asText();
            if (jsonNode.has("height")) heightCm = jsonNode.get("height").asDouble();
            if (jsonNode.has("gender")) gender = jsonNode.get("gender").asText();
        }

        HttpHeaders mpHeaders = new HttpHeaders();
        mpHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> mpBody = new LinkedMultiValueMap<>();
        mpBody.add("user_id", userId);
        mpBody.add("height_cm", heightCm);
        mpBody.add("gender", gender);
        mpBody.add("file", new ByteArrayResource(dto.getFullBodyImage().getBytes()) { @Override public String getFilename() { return dto.getFullBodyImage().getOriginalFilename(); } });
        
        ResponseEntity<Map> mpResponse = restTemplate.postForEntity(aiMediaPipeUrl, new HttpEntity<>(mpBody, mpHeaders), Map.class);
        Map<String, Object> mediaPipeResult = mpResponse.getBody();

        // STEP 3 & 4. 실제 CLIP 추천 기반 가상 피팅 루프
        List<Map<String, Object>> tryOnResultsList = new ArrayList<>();
        String tryOnUrl = aiMediaPipeUrl.replace("/api/v1/analyze/body", "/api/v1/tryon");

        if (clipResult != null && clipResult.containsKey("recommendations")) {
            List<Map<String, Object>> recommendations = (List<Map<String, Object>>) clipResult.get("recommendations");
            int count = 0;
            for (Map<String, Object> item : recommendations) {
                if (count >= 2) break; 
                String garmentName = (String) item.get("image_name");
                try {
                  
                	
                	MultiValueMap<String, Object> tryOnBody = new LinkedMultiValueMap<>();
                    tryOnBody.add("user_id", userId);
                    tryOnBody.add("garment_name", garmentName);
                    
                    Map<String, Object> tryOnData = getOrCreateFitting(userId, item);
                    
                    if (tryOnData != null) {
                        tryOnData.put("garment_info", item); 
                        tryOnResultsList.add(tryOnData);
                        count++;
                    }
                    
                    
                } catch (Exception e) { e.printStackTrace(); }
            }
        }

        // STEP 5. 최종 결과 조립 및 저장
        Map<String, Object> finalResult = new HashMap<>();
        finalResult.put("status", "SUCCESS");
        finalResult.put("taskId", userId);
        finalResult.put("clip_recommendations", clipResult);
        finalResult.put("body_analysis", mediaPipeResult);
        finalResult.put("top5_tryon_images", tryOnResultsList);

        taskCache.put(userId, finalResult);
        return finalResult;
    }

    public Map<String, Object> getAnalysisResult(String taskId) {
        return taskCache.getOrDefault(taskId, Map.of("status", "error", "message", "데이터가 없습니다."));
    }

    // [추가된 기능] 특정 세션 폴더에 가상 피팅 결과물 저장
    public void saveFittingResultToFolder(String taskId, byte[] imageBytes, String fileName) throws IOException {
        Path rootPath = Paths.get("D:/warelens_uploads");
        
        // 가장 최근에 생성된 폴더(숫자가 가장 큰 폴더)를 찾습니다.
        Optional<Path> latestFolder = Files.list(rootPath)
                .filter(Files::isDirectory)
                .max(Comparator.comparing(p -> Long.parseLong(p.getFileName().toString())));

        if (latestFolder.isPresent()) {
            Path target = latestFolder.get().resolve("fitting_" + fileName);
            Files.write(target, imageBytes);
            System.out.println(">>> [LOG] 피팅 결과물 저장 완료: " + target);
        }
    }
    
    private void saveToNewFolder(UploadRequestDto dto) throws IOException {
        Path rootPath = Paths.get("D:/warelens_uploads");
        
        long folderCount = 0;
        if (Files.exists(rootPath)) {
            try (Stream<Path> paths = Files.list(rootPath)) {
                folderCount = paths.filter(Files::isDirectory).count();
            }
        }
        
        Path newFolderPath = rootPath.resolve(String.valueOf(folderCount + 1));
        Files.createDirectories(newFolderPath);
        
        if (dto.getFullBodyImage() != null) {
            Path target = newFolderPath.resolve("body_" + dto.getFullBodyImage().getOriginalFilename());
            Files.copy(dto.getFullBodyImage().getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        }
        if (dto.getClothingImages() != null) {
            for (MultipartFile img : dto.getClothingImages()) {
                Path target = newFolderPath.resolve("garment_" + img.getOriginalFilename());
                Files.copy(img.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            }
        }
        System.out.println(">>> [LOG] 새로운 저장소 생성 완료: " + newFolderPath);
    }
    
    public Map<String, Object> validateBody(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return Map.of("status", "error", "message", "파일이 없습니다.");
        }

        try {
            // [로그 1] 요청 시작 확인
            System.out.println(">>> [LOG] AI 서버로 검증 시작: " + file.getOriginalFilename());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(file.getBytes()) {
                @Override public String getFilename() { return file.getOriginalFilename(); }
            });
            body.add("user_id", "validation_check");
            body.add("height_cm", 175.0);
            body.add("gender", "MALE");

            // AI 서버(8002)로 전신 검증 요청
            restTemplate.postForEntity(aiMediaPipeUrl, new HttpEntity<>(body, headers), Map.class);
            
            // [로그 2] 성공 확인
            System.out.println(">>> [LOG] AI 검증 성공!");
            return Map.of("status", "success");

        } catch (Exception e) {
            // [로그 3] 에러 발생 시 상세 이유 확인
            System.out.println(">>> [LOG] AI 검증 실패 (사유): " + e.getMessage());
            
            return Map.of("status", "error");
        }
    }
    
    public String getAiTryOnUrl() {
        return aiMediaPipeUrl.replace("/api/v1/analyze/body", "/api/v1/tryon");
    }
}