package com.example.demo;

import com.example.demo.util.LogFormatter;
import com.example.demo.service.ValidationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

/**
 * [추천 서비스 데이터 관리 안내]
 * 본 서비스는 외부 AI 서버들과 데이터를 주고받는 통로입니다.
 * - 데이터 표준화 스위치: '----[항목] 삭제 가능----' 블록은 규격 통일 전까지 사용하는 임시 매핑 코드입니다.
 * - 작업 방법: 규격 통일 시 해당 블록을 삭제하고, '#표준코드'의 '#'을 제거하여 사용하십시오.
 */
@Service
public class RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);

    @Value("${file.upload-dir}") private String uploadDir;
    @Value("${ai.clip.url}") private String aiClipUrl;
    @Value("${ai.mediapipe.url}") private String aiMediaPipeUrl;

    private final Map<String, Map<String, Object>> taskCache = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> fittingCache = new ConcurrentHashMap<>();
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ValidationService validationService;

    public RecommendationService(RestTemplate restTemplate, ValidationService validationService) {
        this.restTemplate = restTemplate;
        this.validationService = validationService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * [흐름: 백엔드 -> 가상 피팅(TryOn) AI 서버]
     * 백엔드가 사용자 ID와 옷 정보를 TryOn 서버로 보내고, 
     * 그곳에서 처리된 피팅 결과 이미지를 받아와 최종적으로 프론트엔드에 전달합니다.
     */
    public Map<String, Object> getOrCreateFitting(String userId, Map<String, Object> garmentInfo) {
        String garmentName = (String) garmentInfo.get("image_name");
        String cacheKey = userId + "_" + garmentName;

        if (fittingCache.containsKey(cacheKey)) {
            log.info(">>> [USER: {}] [LOG] 캐시에서 피팅 결과 반환: {}", userId, cacheKey);
            return fittingCache.get(cacheKey);
        }

        log.info(">>> [USER: {}] [LOG] AI 서버 신규 피팅 요청: {}", userId, cacheKey);
        MultiValueMap<String, Object> tryOnBody = new LinkedMultiValueMap<>();
        tryOnBody.add("user_id", userId);

        // ----------------[BACK] TryOn 규격 변경 시 삭제 가능------------
        tryOnBody.add("garment_name", garmentName);
        log.info(">>> [USER: {}] [SCHEMA_MAP] CLIP(image_name) -> TRYON(garment_name) : {} -> {}", userId, garmentName, garmentName);
        // ------------여기까지 삭제------------

        // #표준코드: TryOn 서버 규격이 image_name으로 변경되었을 때 위 블록 삭제 후 아래 활성화
        // #tryOnBody.add("image_name", garmentName);
        // #log.info(">>> [USER: {}] [SCHEMA_MAP] 표준 규격 적용: image_name -> {}", userId, garmentName);
        
        log.debug(">>> [USER: {}] [DATA: AI_TRYON_REQ] {}", userId, LogFormatter.getSafeJson(tryOnBody));
        ResponseEntity<Map> response = restTemplate.postForEntity(getAiTryOnUrl(), new HttpEntity<>(tryOnBody), Map.class);
        Map<String, Object> result = response.getBody();

        if (result != null) {
            log.debug(">>> [USER: {}] [DATA: TRYON_RES] {}", userId, LogFormatter.getSafeJson(result, "tryon_image_base64", "annotated_image_base64"));
            fittingCache.put(cacheKey, result);
        }
        return result;
    }

    /**
     * [흐름: 프론트엔드 -> 백엔드 -> 각 AI 서버(CLIP, MediaPipe)]
     * 1. 프론트엔드가 보낸 데이터를 백엔드가 받아서 해석합니다.
     * 2. 해석된 데이터를 CLIP 서버(스타일 분석)와 MediaPipe 서버(체형 분석)로 전달합니다.
     * 3. 모든 AI 분석 결과가 모이면 백엔드가 최종 요약본을 만들어 프론트엔드에 전달합니다.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> processRecommendation(UploadRequestDto dto) throws Exception {
        long startTime = System.currentTimeMillis();
        saveToNewFolder(dto);

        log.info(">>> [CONNECT: CLIP] 통신 시작");
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

        if (clipResult != null) {
            log.debug(">>> [DATA: CLIP_JSON] CLIP 응답 상세 (요약):\n{}", LogFormatter.getSafeJson(clipResult));
        }

        String userId = "user_" + UUID.randomUUID().toString().substring(0, 8);
        double heightCm = 175.0;
        String gender = "MALE";
        
        // ----------------[FRONT] 데이터 규격 수정 완료 시 삭제 가능------------
        if (dto.getUserInfo() != null && !dto.getUserInfo().trim().isEmpty()) {
            JsonNode node = objectMapper.readTree(dto.getUserInfo());
            if (node.has("userId")) userId = node.get("userId").asText();
            if (node.has("height")) {
                heightCm = node.get("height").asDouble();
                log.info(">>> [USER: {}] [SCHEMA_MAP] FRONT(height) -> MP(height_cm) : {} -> {}", userId, node.get("height"), heightCm);
            }
            if (node.has("gender")) {
                gender = node.get("gender").asText();
                log.info(">>> [USER: {}] [SCHEMA_MAP] FRONT(gender) -> MP(gender) : {} -> {}", userId, node.get("gender"), gender);
            }
        }
        // ------------여기까지 삭제------------

        // #표준코드: FRONT에서 DTO로 직접 전달 시 위 블록 삭제 후 아래 활성화
        // #userId = dto.getUser_id();
        // #heightCm = dto.getHeight_cm();
        // #gender = dto.getGender();

        log.info(">>> [USER: {}] [CONNECT: MEDIAPIPE] 통신 시작", userId);
        HttpHeaders mpHeaders = new HttpHeaders();
        mpHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        
        // ----------------[BACK] MediaPipe 호출 규격 수정 완료 시 삭제 가능------------
        MultiValueMap<String, Object> mpBody = new LinkedMultiValueMap<>();
        mpBody.add("user_id", userId);
        mpBody.add("height_cm", heightCm);
        mpBody.add("gender", gender);
        // ------------여기까지 삭제------------

        // #표준코드: 위 블록 삭제 후 아래 활성화
        // #mpBody.add("user_id", dto.getUser_id());
        // #mpBody.add("height_cm", dto.getHeight_cm());
        // #mpBody.add("gender", dto.getGender());
        
        mpBody.add("file", new ByteArrayResource(dto.getFullBodyImage().getBytes()) { @Override public String getFilename() { return dto.getFullBodyImage().getOriginalFilename(); } });
        
        ResponseEntity<Map> mpResponse = restTemplate.postForEntity(aiMediaPipeUrl, new HttpEntity<>(mpBody, mpHeaders), Map.class);
        Map<String, Object> mediaPipeResult = mpResponse.getBody();
        if (mediaPipeResult != null) {
            log.debug(">>> [USER: {}] [DATA: MP_JSON] MediaPipe 응답 상세 (요약):\n{}", userId, LogFormatter.getSafeJson(mediaPipeResult, "annotated_image_base64"));
        }

        List<Map<String, Object>> tryOnResultsList = new ArrayList<>();
        if (clipResult != null && clipResult.containsKey("recommendations")) {
            List<Map<String, Object>> recommendations = (List<Map<String, Object>>) clipResult.get("recommendations");
            int count = 0;
            for (Map<String, Object> item : recommendations) {
                if (count >= 2) break; 
                try {
                    Map<String, Object> tryOnData = getOrCreateFitting(userId, item);
                    if (tryOnData != null) {
                        log.info(">>> [USER: {}] [MAP: BACKEND -> FRONT] 결과 매핑: {}", userId, item.get("image_name"));
                        tryOnData.put("garment_info", item); 
                        tryOnResultsList.add(tryOnData);
                        count++;
                    }
                } catch (Exception e) { e.printStackTrace(); }
            }
        }

        Map<String, Object> finalResult = new HashMap<>();
        finalResult.put("status", "SUCCESS");
        finalResult.put("taskId", userId);
        finalResult.put("clip_recommendations", clipResult);
        finalResult.put("body_analysis", mediaPipeResult);
        finalResult.put("top5_tryon_images", tryOnResultsList);

        taskCache.put(userId, finalResult);
        log.info(">>> [USER: {}] [PERFORMANCE] 총 소요시간: {}ms", userId, (System.currentTimeMillis() - startTime));
        return finalResult;
    }

    /** [흐름: 백엔드 저장소 -> 분석 요청] 캐싱된 작업 결과를 찾아 프론트엔드에 응답 */
    public Map<String, Object> getAnalysisResult(String taskId) {
        return taskCache.getOrDefault(taskId, Map.of("status", "error", "message", "데이터가 없습니다."));
    }

    /** [흐름: AI 서버 -> 백엔드 파일 시스템] AI 서버가 만든 피팅 이미지 파일을 백엔드 디스크에 저장 */
    public void saveFittingResultToFolder(String taskId, byte[] imageBytes, String fileName) throws IOException {
        Path rootPath = Paths.get("D:/warelens_uploads");
        Optional<Path> latestFolder = Files.list(rootPath).filter(Files::isDirectory).max(Comparator.comparing(p -> Long.parseLong(p.getFileName().toString())));
        if (latestFolder.isPresent()) {
            Path target = latestFolder.get().resolve("fitting_" + fileName);
            Files.write(target, imageBytes);
            log.info(">>> [LOG] 피팅 결과물 저장 완료: {}", target);
        }
    }
    
    /** [흐름: 프론트엔드 -> 백엔드 파일 시스템] 사용자가 보낸 원본 이미지들을 백엔드 디스크에 폴더 단위로 저장 */
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
        log.info(">>> [DATA: FILE] 신규 저장 경로: {}", newFolderPath);
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
        log.info(">>> [LOG] 새로운 저장소 생성 완료: {}", newFolderPath);
    }
    
    /** [흐름: 백엔드 -> 유효성 검사 로직] 입력된 파일이 정상적인지 검증 */
    public Map<String, Object> validateBody(MultipartFile file) {
        return validationService.validate(file);
    }
    
    /** [흐름: 백엔드 내부] MediaPipe 분석 URL을 TryOn API URL로 동적 변환 */
    public String getAiTryOnUrl() {
        return aiMediaPipeUrl.replace("/api/v1/analyze/body", "/api/v1/tryon");
    }
}